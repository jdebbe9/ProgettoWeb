import api from './axios';

export async function getSlotsAvailability(dateStr, { exclude } = {}) {
  const { data } = await api.get('/slots/availability', {
    params: exclude ? { date: dateStr, exclude } : { date: dateStr }
  });
  return data; // { date, slots: [...] }
}

