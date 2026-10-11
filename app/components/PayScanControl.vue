<script setup lang="ts">
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { ClipboardPaste, Flashlight, FlashlightOff, ImageIcon, LoaderCircle, ScanLine, VideoOff, X } from '@lucide/vue'
import {
  type CameraFailure,
  classifyCameraError,
  keepCurrentMediaStream,
  keepCurrentScannerControls,
  trackSupportsTorch,
} from '~/lib/media-stream'

const emit = defineEmits<{
  detected: [string]
}>()

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

type CameraState = 'starting' | 'live' | CameraFailure

const { t } = useI18n()
const route = useRoute()
const isOpen = ref(false)
const video = ref<HTMLVideoElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const cameraState = ref<CameraState>('starting')
const actionError = ref<'image' | 'clipboard' | null>(null)
const torchSupported = ref(false)
const torchOn = ref(false)

let stream: MediaStream | undefined
let scannerControls: IScannerControls | undefined
let animationFrame: number | undefined
let cameraGeneration = 0
let previousBodyOverflow = ''

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' } },
}

async function openScanner() {
  if (isOpen.value)
    return
  isOpen.value = true
  actionError.value = null
  lockBody()
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  closeButton.value?.focus({ preventScroll: true })
  await startCamera()
}

async function startCamera() {
  const generation = ++cameraGeneration
  cameraState.value = 'starting'
  torchSupported.value = false
  torchOn.value = false

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraState.value = 'unavailable'
    return
  }

  if (!('BarcodeDetector' in window)) {
    await startZxingCamera(generation)
    return
  }

  try {
    const requestedStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
    const videoElement = video.value
    const currentStream = keepCurrentMediaStream(
      requestedStream,
      generation === cameraGeneration && isOpen.value && Boolean(videoElement),
    )
    if (!currentStream || !videoElement)
      return

    stream = currentStream
    videoElement.srcObject = stream
    await videoElement.play()
    if (generation !== cameraGeneration)
      return
    markLive(stream)

    const Detector = window.BarcodeDetector as BarcodeDetectorConstructor
    const detector = new Detector({ formats: ['qr_code'] })

    const detect = async () => {
      if (!video.value || !isOpen.value || generation !== cameraGeneration)
        return
      try {
        const [result] = await detector.detect(video.value)
        if (result?.rawValue && generation === cameraGeneration) {
          handleDetected(result.rawValue)
          return
        }
      }
      catch {
        // A frame can fail while the camera is still warming up.
      }
      animationFrame = requestAnimationFrame(() => void detect())
    }
    animationFrame = requestAnimationFrame(() => void detect())
  }
  catch (error) {
    if (generation === cameraGeneration) {
      stopCamera()
      cameraState.value = classifyCameraError(error)
    }
  }
}

async function startZxingCamera(generation: number) {
  const videoElement = video.value
  if (!videoElement)
    return

  try {
    const reader = new BrowserQRCodeReader()
    const controls = await reader.decodeFromConstraints(
      CAMERA_CONSTRAINTS,
      videoElement,
      (result) => {
        if (result && generation === cameraGeneration && isOpen.value)
          handleDetected(result.getText())
      },
    )
    scannerControls = keepCurrentScannerControls(
      controls,
      generation === cameraGeneration && isOpen.value,
    )
    if (scannerControls)
      markLive(videoElement.srcObject instanceof MediaStream ? videoElement.srcObject : undefined)
  }
  catch (error) {
    if (generation === cameraGeneration) {
      stopCamera()
      cameraState.value = classifyCameraError(error)
    }
  }
}

function markLive(activeStream: MediaStream | undefined) {
  cameraState.value = 'live'
  torchSupported.value = trackSupportsTorch(activeStream?.getVideoTracks()[0])
}

function activeVideoTrack(): MediaStreamTrack | undefined {
  const source = stream ?? (video.value?.srcObject instanceof MediaStream ? video.value.srcObject : undefined)
  return source?.getVideoTracks()[0]
}

async function toggleTorch() {
  const track = activeVideoTrack()
  if (!track)
    return
  const next = !torchOn.value
  try {
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
    torchOn.value = next
  }
  catch {
    torchSupported.value = false
  }
}

async function decodeImageFile(file: File): Promise<string> {
  if ('BarcodeDetector' in window) {
    try {
      const bitmap = await createImageBitmap(file)
      const Detector = window.BarcodeDetector as BarcodeDetectorConstructor
      const [result] = await new Detector({ formats: ['qr_code'] }).detect(bitmap)
      bitmap.close()
      if (result?.rawValue)
        return result.rawValue
    }
    catch {
      // Fall back to ZXing below.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const result = await new BrowserQRCodeReader().decodeFromImageUrl(url)
    return result.getText()
  }
  finally {
    URL.revokeObjectURL(url)
  }
}

async function pickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  actionError.value = null
  try {
    handleDetected(await decodeImageFile(file))
  }
  catch {
    actionError.value = 'image'
  }
  finally {
    input.value = ''
  }
}

async function pasteUri() {
  actionError.value = null
  try {
    const raw = await navigator.clipboard.readText()
    if (!raw.trim())
      throw new Error('empty clipboard')
    handleDetected(raw)
  }
  catch {
    actionError.value = 'clipboard'
  }
}

function handleDetected(raw: string) {
  if (!isOpen.value)
    return
  navigator.vibrate?.(30)
  closeScanner()
  emit('detected', raw)
}

function stopCamera() {
  cameraGeneration++
  if (torchOn.value) {
    activeVideoTrack()?.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => {})
    torchOn.value = false
  }
  scannerControls?.stop()
  scannerControls = undefined
  if (animationFrame !== undefined) {
    cancelAnimationFrame(animationFrame)
    animationFrame = undefined
  }
  const videoStream = video.value?.srcObject instanceof MediaStream ? video.value.srcObject : undefined
  stream?.getTracks().forEach(track => track.stop())
  videoStream?.getTracks().forEach(track => track.stop())
  stream = undefined
  if (video.value)
    video.value.srcObject = null
}

function closeScanner() {
  if (!isOpen.value)
    return
  stopCamera()
  isOpen.value = false
  window.removeEventListener('keydown', onKeydown)
  unlockBody()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeScanner()
  }
}

function lockBody() {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBody() {
  document.body.style.overflow = previousBodyOverflow
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden')
    closeScanner()
}

watch(() => route.fullPath, closeScanner)
onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  closeScanner()
})
</script>

<template>
  <span class="inline-flex">
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-2xl text-[#0a0a0a] outline-none hover:bg-[#ececec] focus-visible:ring-1 focus-visible:ring-[#e5e5e5]"
      :aria-label="t('scan')"
      :title="t('scan')"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="openScanner"
    >
      <ScanLine class="size-[18px]" :stroke-width="1.75" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="scanner fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black text-white select-none"
        role="dialog"
        aria-modal="true"
        :aria-label="t('scanTitle')"
      >
        <video
          v-show="cameraState === 'live' || cameraState === 'starting'"
          ref="video"
          class="absolute inset-0 size-full object-cover"
          autoplay
          muted
          playsinline
        />

        <!-- Top bar -->
        <div class="scanner-top relative z-10 grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-3">
          <button
            ref="closeButton"
            type="button"
            class="flex size-11 items-center justify-center rounded-full bg-black/35 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            :aria-label="t('scanClose')"
            @click="closeScanner"
          >
            <X class="size-6" :stroke-width="1.75" />
          </button>
          <h2 class="text-center text-[17px] font-semibold">
            {{ t('scanTitle') }}
          </h2>
          <button
            v-if="torchSupported"
            type="button"
            class="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            :class="torchOn ? 'bg-white text-black' : 'bg-black/35'"
            :aria-label="torchOn ? t('scanTorchOff') : t('scanTorchOn')"
            :aria-pressed="torchOn"
            @click="toggleTorch"
          >
            <Flashlight v-if="!torchOn" class="size-5" :stroke-width="1.75" />
            <FlashlightOff v-else class="size-5" :stroke-width="1.75" />
          </button>
        </div>

        <!-- Viewfinder -->
        <div class="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          <div
            class="viewfinder relative aspect-square w-[70vw] max-w-[280px] rounded-[24px]"
            :class="cameraState === 'live' || cameraState === 'starting' ? 'viewfinder-mask' : 'bg-white/[0.06]'"
          >
            <template v-if="cameraState === 'live' || cameraState === 'starting'">
              <span class="corner left-0 top-0 rounded-tl-[24px] border-l-[3px] border-t-[3px]" />
              <span class="corner right-0 top-0 rounded-tr-[24px] border-r-[3px] border-t-[3px]" />
              <span class="corner bottom-0 left-0 rounded-bl-[24px] border-b-[3px] border-l-[3px]" />
              <span class="corner bottom-0 right-0 rounded-br-[24px] border-b-[3px] border-r-[3px]" />
            </template>

            <span v-if="cameraState === 'live'" class="scan-line" aria-hidden="true" />

            <div
              v-if="cameraState === 'starting'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[13px] text-white/80"
              role="status"
            >
              <LoaderCircle class="size-7 animate-spin motion-reduce:animate-none" :stroke-width="1.75" />
              {{ t('scanStarting') }}
            </div>

            <div
              v-else-if="cameraState === 'denied' || cameraState === 'unavailable'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              role="status"
            >
              <VideoOff class="size-8 text-white/70" :stroke-width="1.5" />
              <p class="text-[15px] font-medium">
                {{ cameraState === 'denied' ? t('scanDeniedTitle') : t('scanUnavailableTitle') }}
              </p>
              <p class="text-[13px] leading-[1.45] text-white/65">
                {{ cameraState === 'denied' ? t('scanDeniedBody') : t('scanUnavailableBody') }}
              </p>
              <button
                v-if="cameraState === 'denied'"
                type="button"
                class="mt-1 h-8 rounded-full bg-white/15 px-4 text-[13px] font-medium outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70"
                @click="startCamera"
              >
                {{ t('scanRetry') }}
              </button>
            </div>
          </div>

          <p v-if="cameraState === 'live' || cameraState === 'starting'" class="relative z-10 mt-6 max-w-[300px] text-center text-[14px] leading-[1.45] text-white/85">
            {{ t('scanHint') }}
          </p>
          <p
            v-if="actionError"
            class="relative z-10 mt-3 rounded-full bg-[#e7000b]/90 px-3 py-1.5 text-center text-[13px] font-medium"
            role="alert"
          >
            {{ actionError === 'image' ? t('scanNoQr') : t('scanClipboardFailed') }}
          </p>
        </div>

        <!-- Bottom actions -->
        <div class="scanner-bottom relative z-10 flex shrink-0 items-start justify-center gap-16">
          <label class="flex cursor-pointer flex-col items-center gap-2 text-[13px] text-white/90">
            <span class="flex size-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25">
              <ImageIcon class="size-6" :stroke-width="1.75" />
            </span>
            {{ t('scanAlbum') }}
            <input class="sr-only" type="file" accept="image/*" @change="pickImage">
          </label>
          <button
            type="button"
            class="flex flex-col items-center gap-2 text-[13px] text-white/90 outline-none"
            @click="pasteUri"
          >
            <span class="flex size-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25">
              <ClipboardPaste class="size-6" :stroke-width="1.75" />
            </span>
            {{ t('pasteUri') }}
          </button>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.scanner-top {
  padding-top: max(env(safe-area-inset-top), 12px);
  padding-left: max(env(safe-area-inset-left), 12px);
  padding-right: max(env(safe-area-inset-right), 12px);
  padding-bottom: 8px;
}

.scanner-bottom {
  padding-top: 16px;
  padding-bottom: max(calc(env(safe-area-inset-bottom) + 16px), 32px);
}

.viewfinder-mask {
  box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.55);
}

.corner {
  position: absolute;
  width: 36px;
  height: 36px;
  border-color: #fff;
}

.scan-line {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 8%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
  animation: scan-sweep 2.2s ease-in-out infinite alternate;
}

@keyframes scan-sweep {
  from {
    top: 8%;
    opacity: 0.4;
  }
  to {
    top: 92%;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scan-line {
    animation: none;
    top: 50%;
    opacity: 0.7;
  }
}
</style>
