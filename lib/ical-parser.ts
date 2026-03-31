import ical from 'ical';

export interface ICalEvent {
  summary: string;
  start: Date;
  end: Date;
  uid: string;
  description?: string;
}

export async function parseICalUrl(url: string): Promise<ICalEvent[]> {
  try {
    const response = await fetch(url);
    const icalData = await response.text();
    
    const events = ical.parseICS(icalData);
    const reservations: ICalEvent[] = [];

    for (const event of Object.values(events)) {
      // Type guard pour vérifier que c'est un événement valide
      if (
        event &&
        typeof event === 'object' &&
        'type' in event &&
        event.type === 'VEVENT' &&
        'start' in event &&
        'end' in event &&
        event.start &&
        event.end
      ) {
        reservations.push({
          summary: ('summary' in event && typeof event.summary === 'string') ? event.summary : '',
          start: new Date(event.start),
          end: new Date(event.end),
          uid: ('uid' in event && typeof event.uid === 'string') ? event.uid : '',
          description: ('description' in event && typeof event.description === 'string') ? event.description : ''
        });
      }
    }

    return reservations;
  } catch (error) {
    console.error('Error parsing iCal:', error);
    throw new Error('Failed to parse iCal URL');
  }
}
