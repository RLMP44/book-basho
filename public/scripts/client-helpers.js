// INPUT: string
// OUTPUT: string
export function formatNameForDisplay(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// INPUT: string
// OUTPUT: string
export function formatDatesForDisplay(date_started = null, date_finished) {
  let formattedDates = '';
  const started = date_started ? new Date(date_started) : null;
  const finished = new Date(date_finished);
  if (started && finished) {
    formattedDates = `${started.getMonth() + 1}/${started.getFullYear()} - ${finished.getMonth() + 1}/${finished.getFullYear()}`;
  } else if (finished) {
    formattedDates = `${finished.getMonth() + 1}/${finished.getFullYear()}`;
  }
  return formattedDates;
}
