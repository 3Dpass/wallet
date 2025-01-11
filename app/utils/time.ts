export const BLOCK_TIME_SECONDS = 60;

export function formatTimeLeft(blocks: number): string {
  const totalSeconds = blocks * BLOCK_TIME_SECONDS;
  const totalHours = totalSeconds / 3600;
  const days = Math.floor(totalHours / 24);
  const remainingHours = Math.floor(totalHours % 24);

  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (totalHours >= 1) {
    return `${Math.floor(totalHours)}h`;
  }
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes}m`;
}

export function formatDuration(secondsDuration: number): string {
  const hours = Math.floor(secondsDuration / 3600);
  const minutes = Math.floor((secondsDuration - hours * 3600) / 60);
  const seconds = secondsDuration - hours * 3600 - minutes * 60;

  const formattedDuration = [];
  if (hours) {
    formattedDuration.push(`${hours} h`);
  }
  if (minutes) {
    formattedDuration.push(`${minutes} min`);
  }
  if (seconds) {
    formattedDuration.push(`${seconds} sec`);
  }
  return formattedDuration.join(" ");
}
