/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_KEY: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'qrcode' {
  interface QRCodeRenderOptions {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  interface QRCodeApi {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeRenderOptions,
    ): Promise<void>
    toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>
  }

  const QRCode: QRCodeApi
  export default QRCode
}
