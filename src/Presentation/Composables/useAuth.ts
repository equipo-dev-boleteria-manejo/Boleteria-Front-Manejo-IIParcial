/**
 * useAuth.ts - Composable de Presentación para Autenticación y Registro
 *
 * Arquitectura:
 * - Lógica Headless (100% desacoplada de la UI visual).
 * - Orquesta SignUpUseCase y LoginUseCase.
 * - Validación reactiva de formulario y gestión de políticas de seguridad.
 */

import { ref, computed } from 'vue';
import { SignUpUseCase, signUpUseCase as defaultSignUpUseCase } from '../../Application/UseCases/SignUp';
import { LoginUseCase, loginUseCase as defaultLoginUseCase } from '../../Application/UseCases/Login';
import { useAuthStore } from '../Store/authStore';
import { usePasswordValidation } from './usePasswordValidation';
import { useCedulaValidation } from './useCedulaValidation';
import { useEmailValidation } from './useEmailValidation';

export function useAuth(
  signUpService: SignUpUseCase = defaultSignUpUseCase,
  loginService: LoginUseCase = defaultLoginUseCase
) {
  const authStore = useAuthStore();
  const passwordValidator = usePasswordValidation();
  const cedulaValidator = useCedulaValidation();
  const emailValidator = useEmailValidation();

  const nombres = ref('');
  const apellidos = ref('');

  const {
    email,
    errorEmail,
    validateEmail,
  } = emailValidator;

  const {
    cedula,
    errorCedula,
    validateCedula,
  } = cedulaValidator;

  const {
    password,
    showPassword,
    errorPassword,
    passwordRequirements,
    completedRequirements,
  } = passwordValidator;

  const loading = ref(false);
  const isRegistering = ref(false);
  const cooldownActive = ref(false);

  const errorNombres = ref('');
  const errorApellidos = ref('');
  const globalError = ref('');
  const mensajeExito = ref('');

  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);

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

  const validatePassword = () => {
    if (!password.value) {
      errorPassword.value = 'Debes ingresar tu contraseña';
      return false;
    }
    if (isRegistering.value) {
      return passwordValidator.validatePassword();
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
        mensajeExito.value = '¡Cuenta registrada con éxito! Ya puedes iniciar sesión';
        isRegistering.value = false;
        password.value = '';
      } else {
        await authStore.login(email.value.trim(), password.value);
        mensajeExito.value = 'Inicio de sesión exitoso';
      }
    } catch (err: unknown) {
      globalError.value = err instanceof Error ? err.message : 'Error en la operación de autenticación';
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
