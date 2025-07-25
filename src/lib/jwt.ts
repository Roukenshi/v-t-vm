
export const getTokenFromStorage = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setTokenInStorage = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeTokenFromStorage = (): void => {
  localStorage.removeItem('auth_token');
};

export const isTokenExpired = (token: string): boolean =>{
  try{
    //simple check- let backend handle validation
    if(!token) return true;

    //Decode payload without verification  (just for expiry check)
    const parts = token.split('.');
    if (parts.length !==3) return true;

    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;

    const currentTime = Math.floor(Date.now()/1000);
    return payload.exp< currentTime;
  }catch (error){
    return true;
  }
};
