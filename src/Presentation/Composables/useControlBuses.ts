import { ref } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { EstadoBus } from '../../Domain/Constants/EstadosSistema'

export function useControlBuses() {
  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  async function obtenerBusesActivos() {
    const { data, error: err } = await supabase
      .from('Buses')
      .select('Id, Numero, Placa, TotalAsientos, Estado, CooperativaId')
      .eq('Estado', 'Activo')
      .order('Numero', { ascending: true })

    if (err) throw err

    return data || []
  }

  async function obtenerBusesDisponiblesPorFecha(fecha: string) {
    loading.value = true
    error.value = ''

    try {
      const busesActivos = await obtenerBusesActivos()

      const { data: rutasOcupadas, error: rutasError } = await supabase
        .from('Rutas')
        .select('Id, BusId, Fecha, Estado')
        .eq('Fecha', fecha)
        .in('Estado', ['Programada', 'Habilitada', 'EnCurso'])

      if (rutasError) throw rutasError

      const busesOcupados = new Set(
        (rutasOcupadas || []).map((ruta: any) => Number(ruta.BusId))
      )

      return busesActivos.filter((bus: any) => {
        return !busesOcupados.has(Number(bus.Id))
      })
    } catch (err: any) {
      error.value = err.message || 'No se pudieron obtener buses disponibles.'
      return []
    } finally {
      loading.value = false
    }
  }

  async function cambiarEstadoBus(busId: number, estado: EstadoBus) {
    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const { error: err } = await supabase
        .from('Buses')
        .update({ Estado: estado })
        .eq('Id', busId)

      if (err) throw err

      success.value = `Bus actualizado a estado ${estado}.`
    } catch (err: any) {
      error.value = err.message || 'No se pudo cambiar el estado del bus.'
    } finally {
      loading.value = false
    }
  }

  async function marcarBusEnRuta(busId: number) {
    await cambiarEstadoBus(busId, 'EnRuta')
  }

  async function liberarBus(busId: number) {
    await cambiarEstadoBus(busId, 'Activo')
  }

  async function desactivarBus(busId: number) {
    await cambiarEstadoBus(busId, 'Inactivo')
  }

  async function validarBusDisponible(busId: number, fecha: string) {
    const { data, error: err } = await supabase
      .from('Rutas')
      .select('Id')
      .eq('BusId', busId)
      .eq('Fecha', fecha)
      .in('Estado', ['Programada', 'Habilitada', 'EnCurso'])
      .limit(1)

    if (err) throw err

    return !data || data.length === 0
  }

  return {
    loading,
    error,
    success,
    obtenerBusesActivos,
    obtenerBusesDisponiblesPorFecha,
    cambiarEstadoBus,
    marcarBusEnRuta,
    liberarBus,
    desactivarBus,
    validarBusDisponible,
  }
}