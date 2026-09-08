export const generateUuid = (): string => {
  let timestamp = Date.now();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, marker => {
    const random = Math.floor((timestamp + Math.random() * 16) % 16);
    timestamp = Math.floor(timestamp / 16);
    const value = marker === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
};
