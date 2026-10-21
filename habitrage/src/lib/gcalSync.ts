export async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.items;
}

export async function createCalendarEvent(accessToken: string, event: {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}) {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create calendar event: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function syncShiftToGoogle(accessToken: string, shift: any, employerName: string) {
  const startDateTime = new Date(`${shift.shiftDate}T${shift.startTime}:00`);
  const endDateTime = new Date(`${shift.shiftDate}T${shift.endTime}:00`);

  const event = {
    summary: `${employerName} - Shift`,
    description: `Work shift logged via HABITRAGE.\nHours: ${shift.scheduledHours || 0}\nEst. Net: $${(shift.netEstimatedPay || 0).toFixed(2)}`,
    start: { dateTime: startDateTime.toISOString() },
    end: { dateTime: endDateTime.toISOString() }
  };

  return createCalendarEvent(accessToken, event);
}

export async function importShiftsFromGoogle(accessToken: string, employers: any[]) {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  
  const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
  
  const importedShifts: any[] = [];
  
  for (const event of events) {
    const summary = event.summary?.toLowerCase() || '';
    const employer = employers.find(e => 
      summary.includes(e.name.toLowerCase()) || 
      e.roles.some((r: any) => summary.includes(r.roleName.toLowerCase()))
    );

    if (employer) {
      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      if (hours > 0) {
        importedShifts.push({
          employerId: employer.employerId,
          shiftDate: start.toISOString().split('T')[0],
          startTime: start.toTimeString().split(' ')[0].substring(0, 5),
          endTime: end.toTimeString().split(' ')[0].substring(0, 5),
          scheduledHours: hours,
          roleId: employer.roles[0]?.roleId || 'default'
        });
      }
    }
  }
  
  return importedShifts;
}
