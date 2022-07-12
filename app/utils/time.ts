export function formatDuration(secondsDuration) {
  /**
   * Return a string representing the duration in seconds in format like "54 seconds" or "4 minutes 3 seconds"
   */
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
