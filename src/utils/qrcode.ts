export function extraerCodigoBoleto(valorLeido: string): string {
  const valor = String(valorLeido || '').trim()

  if (!valor) return ''

  try {
    const parsed = JSON.parse(valor)

    return String(
      parsed.CodigoQr ||
      parsed.codigoQr ||
      parsed.codigoQR ||
      parsed.CodigoBarras ||
      parsed.codigoBarras ||
      parsed.codigo ||
      parsed.code ||
      valor
    ).trim()
  } catch {
    return valor
  }
}
