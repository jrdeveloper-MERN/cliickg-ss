export const safeParse = <T>(jsonString: string | null, fallback: T, keyName: string = 'storage'): T => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`Error parsing JSON for key "${keyName}":`, error);
    return fallback;
  }
};

export default safeParse;
