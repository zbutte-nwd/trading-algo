// Market hours utility - only refresh during trading hours
export const isMarketHours = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (day === 0 || day === 6) {
    return false;
  }

  // Convert to EST
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market hours: 9:30 AM - 4:00 PM EST
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM

  return totalMinutes >= marketOpen && totalMinutes < marketClose;
};

export const getNextRefreshInterval = (): number => {
  if (isMarketHours()) {
    return 60000; // 1 minute during market hours
  } else {
    return 300000; // 5 minutes outside market hours
  }
};
