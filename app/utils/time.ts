export const BLOCK_TIME_SECONDS = 60;

export function formatTimeLeft(
  blocks: number,
  t?: (key: string) => string
): string {
  const totalSeconds = blocks * BLOCK_TIME_SECONDS;
  const totalHours = totalSeconds / 3600;
  const days = Math.floor(totalHours / 24);
  const remainingHours = Math.floor(totalHours % 24);

  if (days > 0) {
    const daysText = t ? t("utils.time_units.days") : "d";
    const hoursText = t ? t("utils.time_units.hours") : "h";
    return remainingHours > 0
      ? `${days}${daysText} ${remainingHours}${hoursText}`
      : `${days}${daysText}`;
  }
  if (totalHours >= 1) {
    const hoursText = t ? t("utils.time_units.hours") : "h";
    return `${Math.floor(totalHours)}${hoursText}`;
  }
  const minutes = Math.ceil(totalSeconds / 60);
  const minutesText = t ? t("utils.time_units.minutes") : "m";
  return `${minutes}${minutesText}`;
}

export function formatDuration(
  secondsDuration: number,
  t?: (key: string) => string
): string {
  const hours = Math.floor(secondsDuration / 3600);
  const minutes = Math.floor((secondsDuration - hours * 3600) / 60);
  const seconds = secondsDuration - hours * 3600 - minutes * 60;

  const formattedDuration = [];
  if (hours) {
    const hoursText = t ? t("utils.time_units.hours") : "h";
    formattedDuration.push(`${hours} ${hoursText}`);
  }
  if (minutes) {
    const minutesText = t ? t("utils.time_units.minutes") : "min";
    formattedDuration.push(`${minutes} ${minutesText}`);
  }
  if (seconds) {
    const secondsText = t ? t("utils.time_units.seconds") : "sec";
    formattedDuration.push(`${seconds} ${secondsText}`);
  }
  return formattedDuration.join(" ");
}
