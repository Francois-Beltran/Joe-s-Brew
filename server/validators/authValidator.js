export const validateLogin = (body, type) => {
  const { password } = body;

  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  return { success: true, password };
};