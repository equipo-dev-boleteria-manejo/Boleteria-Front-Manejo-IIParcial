const readEnv = (key: string): string => {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === 'string' ? value : '';
};

export const sendGridApiKey = readEnv('VITE_SENDGRID_API_KEY');
export const sendGridEmail = readEnv('VITE_SENDGRID_EMAIL');
