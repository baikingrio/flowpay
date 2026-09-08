<script setup lang="ts">
import { BrowserQRCodeReader } from '@zxing/browser'

const emit = defineEmits<{
  detected: [string]
}>()

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

const { t } = useI18n()
const isOpen = ref(false)
const video = ref<HTMLVideoElement | null>(null)
const cameraError = ref(false)
const scanError = ref(false)

let stream: MediaStream | undefined
let animationFrame: number | undefined

async function togglePanel() {
  if (isOpen.value) {
    closePanel()
    return
  }

  isOpen.value = true
  await nextTick()
  await startCamera()
}

async function startCamera() {
  cameraError.value = false
  if (!('BarcodeDetector' in window)) {
    cameraError.value = true
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
    })
    if (!isOpen.value || !video.value) {
      stopCamera()
      return
    }

    video.value.srcObject = stream
    await video.value.play()
    const Detector = window.BarcodeDetector as BarcodeDetectorConstructor
    const detector = new Detector({ formats: ['qr_code'] })

    const detect = async () => {
      if (!video.value || !isOpen.value)
        return
      try {
        const [result] = await detector.detect(video.value)
        if (result?.rawValue) {
          emitDetected(result.rawValue)
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
  catch {
    cameraError.value = true
    stopCamera()
  }
}

async function pickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  scanError.value = false
  const url = URL.createObjectURL(file)
  try {
    const result = await new BrowserQRCodeReader().decodeFromImageUrl(url)
    emitDetected(result.getText())
  }
  catch {
    scanError.value = true
  }
  finally {
    URL.revokeObjectURL(url)
    input.value = ''
  }
}

async function pasteUri() {
  scanError.value = false
  try {
    const raw = await navigator.clipboard.readText()
    if (!raw.trim())
      throw new Error('empty clipboard')
    emitDetected(raw)
  }
  catch {
    scanError.value = true
  }
}

function emitDetected(raw: string) {
  emit('detected', raw)
  closePanel()
}

function stopCamera() {
  if (animationFrame !== undefined) {
    cancelAnimationFrame(animationFrame)
    animationFrame = undefined
  }
  stream?.getTracks().forEach(track => track.stop())
  stream = undefined
  if (video.value)
    video.value.srcObject = null
}

function closePanel() {
  isOpen.value = false
  stopCamera()
}

onBeforeUnmount(closePanel)
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      class="h-10 rounded-[18px] border border-[#e5e5e5] bg-white px-3 text-[14px] font-medium text-[#0a0a0a] outline-none hover:bg-[#f5f5f5] focus-visible:ring-1 focus-visible:ring-[#e5e5e5]"
      :aria-expanded="isOpen"
      @click="togglePanel"
    >
      {{ t('scan') }}
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 z-20 mt-2 w-64 rounded-[20px] border border-[#e5e5e5] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <video
        v-show="!cameraError"
        ref="video"
        class="aspect-square w-full rounded-[14px] bg-[#0a0a0a] object-cover"
        muted
        playsinline
      />
      <p v-if="cameraError" class="mb-3 text-[13px] leading-[1.4] text-[#737373]">
        {{ t('cameraUnavailable') }}
      </p>

      <div class="mt-3 flex gap-2">
        <label class="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-2xl bg-[#f5f5f5] px-2 text-[13px] font-medium">
          {{ t('pickImage') }}
          <input class="sr-only" type="file" accept="image/*" @change="pickImage">
        </label>
        <button
          type="button"
          class="h-9 flex-1 rounded-2xl bg-[#f5f5f5] px-2 text-[13px] font-medium"
          @click="pasteUri"
        >
          {{ t('pasteUri') }}
        </button>
      </div>
      <p v-if="scanError" class="mt-2 text-[13px] leading-[1.4] text-[#e7000b]">
        {{ t('scanFailed') }}
      </p>
    </div>
  </div>
</template>
