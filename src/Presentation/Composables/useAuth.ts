/**
 * useAuth.ts - Composable de Presentación para Autenticación y Registro
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Orquesta SignUpUseCase y LoginUseCase.
 * - Validación reactiva de formulario y gestión de políticas de seguridad.
 */

import { ref, computed } from 'vue';
import { Cedula } from '../../Domain/ValueObjects/Cedula';
import { SignUpUseCase, signUpUseCase as defaultSignUpUseCase } from '../../Application/UseCases/SignUp';
import { LoginUseCase, loginUseCase as defaultLoginUseCase } from '../../Application/UseCases/Login';
import { useAuthStore } from '../Store/authStore';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGITUD_MINIMA_PASSWORD = 8;

export function useAuth(
  signUpService: SignUpUseCase = defaultSignUpUseCase,
  loginService: LoginUseCase = defaultLoginUseCase
) {
  const authStore = useAuthStore();

  const email = ref('');
  const password = ref('');
  const nombres = ref('');
  const apellidos = ref('');
  const cedula = ref('');

  const loading = ref(false);
  const isRegistering = ref(false);
  const showPassword = ref(false);
  const cooldownActive = ref(false);

  const errorEmail = ref('');
  const errorPassword = ref('');
  const errorNombres = ref('');
  const errorApellidos = ref('');
  const errorCedula = ref('');
  const globalError = ref('');
  const mensajeExito = ref('');

  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);

  const passwordRequirements = computed(() => [
    {
      label: `Mínimo ${LONGITUD_MINIMA_PASSWORD} caracteres`,
      isValid: password.value.length >= LONGITUD_MINIMA_PASSWORD,
    },
    {
      label: 'Una letra mayúscula',
      isValid: /[A-Z]/.test(password.value),
    },
    {
      label: 'Una letra minúscula',
      isValid: /[a-z]/.test(password.value),
    },
    {
      label: 'Al menos un número',
      isValid: /[0-9]/.test(password.value),
    },
  ]);

  const completedRequirements = computed(() =>
    passwordRequirements.value.filter((req) => req.isValid).length
  );

  const validateNombres = () => {
    const nombresLimpios = nombres.value.trim();
    if (!nombresLimpios) {
      errorNombres.value = 'Debes ingresar tus nombres';
      return false;
    }
    errorNombres.value = '';
    return true;
  };

  const validateApellidos = () => {
    const apellidosLimpios = apellidos.value.trim();
    if (!apellidosLimpios) {
      errorApellidos.value = 'Debes ingresar tus apellidos';
      return false;
    }
    errorApellidos.value = '';
    return true;
  };

  const validateCedula = () => {
    const cedulaLimpia = cedula.value.trim();
    if (!cedulaLimpia) {
      errorCedula.value = 'Debes ingresar tu número de cédula';
      return false;
    }
    if (!Cedula.validar(cedulaLimpia)) {
      errorCedula.value = 'La cédula no es válida según el estándar ecuatoriano (Módulo 10)';
      return false;
    }
    errorCedula.value = '';
    return true;
  };

  const validateEmail = () => {
    const emailLimpio = email.value.trim();
    if (!emailLimpio) {
      errorEmail.value = 'Debes ingresar tu correo electrónico';
      return false;
    }
    if (!REGEX_EMAIL.test(emailLimpio)) {
      errorEmail.value = 'El formato de correo electrónico es inválido';
      return false;
    }
    errorEmail.value = '';
    return true;
  };

  const validatePassword = () => {
    if (!password.value) {
      errorPassword.value = 'Debes ingresar tu contraseña';
      return false;
    }
    if (isRegistering.value) {
      if (password.value.length < LONGITUD_MINIMA_PASSWORD) {
        errorPassword.value = `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`;
        return false;
      }
      if (completedRequirements.value < passwordRequirements.value.length) {
        errorPassword.value = 'La contraseña no cumple con los requisitos de seguridad';
        return false;
      }
    }
    errorPassword.value = '';
    return true;
  };

  const handleAuthSubmit = async () => {
    if (loading.value || cooldownActive.value) return;

    globalError.value = '';
    mensajeExito.value = '';

    const emailOk = validateEmail();
    const passOk = validatePassword();

    let formValido = emailOk && passOk;

    if (isRegistering.value) {
      const nomOk = validateNombres();
      const apeOk = validateApellidos();
      const cedOk = validateCedula();
      formValido = formValido && nomOk && apeOk && cedOk;
    }

    if (!formValido) {
      globalError.value = 'Revisa los campos requeridos antes de continuar';
      return;
    }

    loading.value = true;

    try {
      if (isRegistering.value) {
        await signUpService.execute({
          email: email.value.trim(),
          password: password.value,
          nombres: nombres.value.trim(),
          apellidos: apellidos.value.trim(),
          cedula: cedula.value.trim(),
        });
        mensajeExito.value = '¡Cuenta registrada con éxito!';

        try {
          await authStore.login(email.value.trim(), password.value);
        } catch {
          mensajeExito.value = '¡Cuenta registrada con éxito! Ya puedes iniciar sesión';
          isRegistering.value = false;
          password.value = '';
        }
      } else {
        await authStore.login(email.value.trim(), password.value);
        mensajeExito.value = 'Inicio de sesión exitoso';
      }
    } catch (err: any) {
      globalError.value = err.message || 'Error en la operación de autenticación';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleModoRegistro = () => {
    isRegistering.value = !isRegistering.value;
    globalError.value = '';
    mensajeExito.value = '';
  };

  return {
    email,
    password,
    nombres,
    apellidos,
    cedula,
    loading,
    isRegistering,
    showPassword,
    cooldownActive,
    errorEmail,
    errorPassword,
    errorNombres,
    errorApellidos,
    errorCedula,
    globalError,
    mensajeExito,
    user,
    isAuthenticated,
    passwordRequirements,
    completedRequirements,
    validateEmail,
    validatePassword,
    validateNombres,
    validateApellidos,
    validateCedula,
    handleAuthSubmit,
    toggleModoRegistro,
  };
}
