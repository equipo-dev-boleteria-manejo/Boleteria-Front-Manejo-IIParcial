// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalCrearFrecuencia from './ModalCrearFrecuencia.vue'
import type { DatosEdicionFrecuencia } from '../Composables/presentacionFrecuencias'

function montar(props: Record<string, unknown> = {}) {
  return mount(ModalCrearFrecuencia, {
    props: { modelValue: true, cooperativaId: 1, ...props },
    global: { stubs: { teleport: true } },
  })
}

const datosEdicion: DatosEdicionFrecuencia = {
  cooperativaId: 1,
  identificadorFrecuencia: 'FR-001',
  ciudadOrigen: 'Quito',
  ciudadDestino: 'Cuenca',
  horaSalida: '08:30',
  esDirecto: false,
  diasOperacion: ['Lunes', 'Viernes'],
  codigoAnt: 'ANT-0145',
  resolucionAnt: '',
  totalParadas: 0,
}

const valor = (wrapper: ReturnType<typeof montar>, selector: string) =>
  (wrapper.find(selector).element as HTMLInputElement).value

describe('ModalCrearFrecuencia - registrar', () => {
  it('formulario vacío: al enviar muestra los obligatorios en rojo y no emite nada', async () => {
    const wrapper = montar()

    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('La ciudad de origen es obligatoria')
    expect(wrapper.text()).toContain('La ciudad de destino es obligatoria')
    expect(wrapper.text()).toContain('La hora de salida es obligatoria')
    expect(valor(wrapper, '#frecuencia-identificador')).toBe('FR-001')
  })

  it('no muestra errores hasta que el usuario interactúa o intenta enviar', () => {
    const wrapper = montar()

    expect(wrapper.text()).not.toContain('es obligatoria')
    expect(wrapper.text()).not.toContain('es obligatorio')
  })

  it('valida en tiempo real y bloquea el botón mientras haya errores', async () => {
    const wrapper = montar()

    await wrapper.find('#frecuencia-origen').setValue('Quito9')

    expect(wrapper.text()).toContain('Solo se permiten letras, espacios, puntos y guiones')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('#frecuencia-origen').setValue('Quito')

    expect(wrapper.text()).not.toContain('Solo se permiten letras')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('rechaza un destino igual al origen', async () => {
    const wrapper = montar()

    await wrapper.find('#frecuencia-origen').setValue('Quito')
    await wrapper.find('#frecuencia-destino').setValue('quito')

    expect(wrapper.text()).toContain('El destino debe ser distinto del origen')
  })

  it('exige al menos un día de operación', async () => {
    const wrapper = montar()

    for (const casilla of wrapper.findAll('fieldset input[type="checkbox"]')) {
      await casilla.setValue(false)
    }

    expect(wrapper.text()).toContain('Selecciona al menos un día de operación')
  })

  it('con datos válidos emite submit con el DTO y la cooperativa de la sesión', async () => {
    const wrapper = montar({ cooperativaId: 4 })

    await wrapper.find('#frecuencia-origen').setValue(' Quito ')
    await wrapper.find('#frecuencia-destino').setValue('Cuenca')
    await wrapper.find('#frecuencia-hora').setValue('08:30')
    await wrapper.find('#frecuencia-identificador').setValue('FR-001')
    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.emitted('guardar')).toBeUndefined()
    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({
      cooperativaId: 4,
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Cuenca',
      horaSalida: '08:30',
      identificadorFrecuencia: 'FR-001',
      esDirecto: true,
    })
  })

  it('sin cooperativa en la sesión la exige y la envía en el DTO', async () => {
    const wrapper = montar({ cooperativaId: null })

    await wrapper.find('#form-frecuencia').trigger('submit')
    expect(wrapper.text()).toContain('cooperativa válida')

    await wrapper.find('#frecuencia-cooperativa').setValue('3')
    await wrapper.find('#frecuencia-origen').setValue('Quito')
    await wrapper.find('#frecuencia-destino').setValue('Cuenca')
    await wrapper.find('#frecuencia-hora').setValue('08:30')
    await wrapper.find('#frecuencia-identificador').setValue('FR-002')
    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({ cooperativaId: 3 })
  })

  it('al reabrirse el formulario vuelve limpio', async () => {
    const wrapper = montar()
    await wrapper.find('#frecuencia-origen').setValue('Quito9')

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(valor(wrapper, '#frecuencia-origen')).toBe('')
    expect(wrapper.text()).not.toContain('Solo se permiten letras')
  })
})

describe('ModalCrearFrecuencia - editar', () => {
  it('muestra el título de edición y precarga los datos de la frecuencia', () => {
    const wrapper = montar({ frecuencia: datosEdicion })

    expect(wrapper.text()).toContain('Editar frecuencia')
    expect(wrapper.text()).toContain('Guardar cambios')
    expect(valor(wrapper, '#frecuencia-origen')).toBe('Quito')
    expect(valor(wrapper, '#frecuencia-destino')).toBe('Cuenca')
    expect(valor(wrapper, '#frecuencia-hora')).toBe('08:30')
    expect(valor(wrapper, '#frecuencia-identificador')).toBe('FR-001')
    expect(valor(wrapper, '#frecuencia-codigo-ant')).toBe('ANT-0145')

    const marcados = wrapper
      .findAll('fieldset input[type="checkbox"]')
      .filter((casilla) => (casilla.element as HTMLInputElement).checked)
    expect(marcados).toHaveLength(2)
  })

  it('bloquea el identificador y la cooperativa, que no se pueden modificar', () => {
    const wrapper = montar({ frecuencia: datosEdicion, cooperativaId: null })

    expect(wrapper.find('#frecuencia-identificador').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Cooperativa N.º 1')
    expect(wrapper.text()).toContain('No modificable')
    expect(wrapper.find('#frecuencia-cooperativa').exists()).toBe(false)
  })

  it('al guardar emite solo los campos modificables y no un registro nuevo', async () => {
    const wrapper = montar({ frecuencia: datosEdicion })

    await wrapper.find('#frecuencia-destino').setValue('Loja')
    await wrapper.find('#frecuencia-hora').setValue('09:15')
    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('guardar')).toHaveLength(1)
    expect(wrapper.emitted('guardar')?.[0][0]).toEqual({
      ciudadOrigen: 'Quito',
      ciudadDestino: 'Loja',
      horaSalida: '09:15',
      esDirecto: false,
      diasOperacion: ['Lunes', 'Viernes'],
      codigoAnt: 'ANT-0145',
      resolucionAnt: '',
    })
  })

  it('también valida en la edición y no guarda con datos inválidos', async () => {
    const wrapper = montar({ frecuencia: datosEdicion })

    await wrapper.find('#frecuencia-destino').setValue('')
    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.text()).toContain('La ciudad de destino es obligatoria')
    expect(wrapper.emitted('guardar')).toBeUndefined()
  })
  it('si la frecuencia ya tiene paradas, marcarla como directa avisa que se eliminarán y permite guardar', async () => {
    const wrapper = montar({ frecuencia: { ...datosEdicion, totalParadas: 3 } })

    const directo = wrapper.findAll('input[type="checkbox"]').find((casilla) => !casilla.element.closest('fieldset'))
    await directo?.setValue(true)

    expect(wrapper.text()).toContain('se eliminarán sus 3 paradas intermedias')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('#form-frecuencia').trigger('submit')
    expect(wrapper.emitted('guardar')?.[0][0]).toMatchObject({ esDirecto: true })
  })

  it('al guardar sin haber modificado nada emite sinCambios y no guardar', async () => {
    const wrapper = montar({ frecuencia: datosEdicion })

    await wrapper.find('#form-frecuencia').trigger('submit')

    expect(wrapper.emitted('guardar')).toBeUndefined()
    expect(wrapper.emitted('sinCambios')).toHaveLength(1)
  })
});
