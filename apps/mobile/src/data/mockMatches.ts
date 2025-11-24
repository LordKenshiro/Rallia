import { Match } from '../types';

/**
 * Mock data for matches
 * TODO: Replace with actual Supabase queries when backend is ready
 */
export const getMockMatches = (): Match[] => [
  {
    id: '1',
    title: "Jaad's Singles",
    ageRestriction: '25+',
    date: 'Nov 10',
    time: '6:00PM - 7:00PM',
    location: 'IGA Stadium',
    court: 'Court 3',
    tags: ['Competitive', 'Men Only', 'Open Access'],
    participantCount: 2,
    participantImages: ['https://i.pravatar.cc/150?img=12', 'https://i.pravatar.cc/150?img=13'],
  },
  {
    id: '2',
    title: "Emy's Doubles",
    ageRestriction: '25+',
    date: 'Nov 11',
    time: '9:00AM - 11:00AM',
    location: 'MLK Tennis Courts',
    court: 'No Court',
    tags: ['Practice', 'All Gender', 'Closed Access'],
    participantCount: 4,
    participantImages: [
      'https://i.pravatar.cc/150?img=20',
      'https://i.pravatar.cc/150?img=21',
      'https://i.pravatar.cc/150?img=22',
      'https://i.pravatar.cc/150?img=23',
    ],
  },
  {
    id: '3',
    title: "Sara's Singles",
    ageRestriction: '25+',
    date: 'Nov 11',
    time: '2:00PM - 3:30PM',
    location: 'Jeanne-Mance Park',
    court: 'Court 9',
    tags: ['Competitive', 'Women Only', 'Closed Access'],
    participantCount: 2,
    participantImages: ['https://i.pravatar.cc/150?img=32', 'https://i.pravatar.cc/150?img=33'],
  },
];
