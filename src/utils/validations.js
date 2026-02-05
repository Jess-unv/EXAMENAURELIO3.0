// utils/validations.js
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  // Acepta números con o sin código de país
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isValidPassword = (password) => {
  return password.length >= 6;
};

export const validateForm = (data, isRegister) => {
  const errors = {};

  if (!data.email) {
    errors.email = 'El correo electrónico es requerido';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Ingresa un correo electrónico válido';
  }

  if (!data.password) {
    errors.password = 'La contraseña es requerida';
  } else if (data.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres';
  }

  if (isRegister) {
    if (!data.name) {
      errors.name = 'El nombre completo es requerido';
    }

    if (!data.phone) {
      errors.phone = 'El teléfono es requerido';
    } else if (!isValidPhone(data.phone)) {
      errors.phone = 'Ingresa un número de teléfono válido';
    }

    if (!data.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
  }

  return errors;
};