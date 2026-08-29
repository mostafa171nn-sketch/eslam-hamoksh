import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

/**
 * Realistic DEMO DATA seeder for the ECMS (MaaRech) platform.
 *
 * This is TEST/DEMO data only. It never deletes, drops, or resets anything:
 * every create is guarded by a unique key (username / slug / studentNumber /
 * paymentNumber / composite key) so re-running is idempotent.
 *
 * It reuses the existing Prisma models, enums, roles and relations exactly as
 * defined in prisma/schema.prisma — nothing is invented.
 */
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@12345';

/** JS weekday used by the app (0=Sunday .. 6=Saturday). */
const WD_SUN = 0, WD_MON = 1, WD_TUE = 2, WD_WED = 3, WD_THU = 4, WD_FRI = 5, WD_SAT = 6;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date of the next occurrence of a weekday (>= offsetDays from today). */
function nextWeekday(day: number, offsetDays = 0): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const target = new Date(base.getTime() + offsetDays * 86400000);
  const diff = (day - target.getDay() + 7) % 7;
  target.setDate(target.getDate() + diff);
  return target;
}

/** Parse "HH:MM" into minutes for ordering / comparison. */
function timeToMin(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Arabic', 'Computer Science', 'French',
];

const GRADES = [
  'Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary',
  'Grade 1 Preparatory', 'Grade 2 Preparatory', 'Grade 3 Preparatory',
  'Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary',
];

interface CenterSeed {
  slug: string;
  name: string;
  nameEn: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  lat: number;
  lng: number;
  admin: { username: string; fullName: string; phone: string; email: string };
  plan: string;
}

const CENTERS: CenterSeed[] = [
  {
    slug: 'nile-education-center', name: 'Nile Education Center', nameEn: 'Nile Education Center',
    address: '90 Rd 90, Fifth Settlement, New Cairo', city: 'Cairo',
    phone: '+20 2 2445 1200', email: 'info@nile-education.eg', website: 'https://nile-education.eg',
    description: 'A leading center in New Cairo offering comprehensive academic programs for primary, preparatory and secondary students with a focus on STEM subjects.',
    lat: 30.0131, lng: 31.4869,
    admin: { username: 'demo.center.admin1', fullName: 'Karim El-Sayed', phone: '+20 111 234 5678', email: 'k.el-sayed@nile-education.eg' },
    plan: 'Tier 2',
  },
  {
    slug: 'future-academy', name: 'Future Academy', nameEn: 'Future Academy',
    address: '12 Abbas El-Akkad St, Nasr City', city: 'Cairo',
    phone: '+20 2 2276 5400', email: 'contact@future-academy.eg', website: 'https://future-academy.eg',
    description: 'Modern academy in Nasr City specializing in languages, computer science and advanced mathematics for ambitious students.',
    lat: 30.0623, lng: 31.3393,
    admin: { username: 'demo.center.admin2', fullName: 'Dina Adel', phone: '+20 122 345 6789', email: 'd.adel@future-academy.eg' },
    plan: 'Tier 3',
  },
  {
    slug: 'excellence-learning-center', name: 'Excellence Learning Center', nameEn: 'Excellence Learning Center',
    address: '26 Mosadak St, Dokki', city: 'Giza',
    phone: '+20 2 3336 7200', email: 'hello@excellence-learning.eg', website: 'https://excellence-learning.eg',
    description: 'A supportive learning environment in Dokki offering personalized tutoring in sciences and mathematics for all grades.',
    lat: 30.0370, lng: 31.2075,
    admin: { username: 'demo.center.admin3', fullName: 'Hassan Farouk', phone: '+20 100 456 7890', email: 'h.farouk@excellence-learning.eg' },
    plan: 'Tier 1',
  },
  {
    slug: 'smart-minds-academy', name: 'Smart Minds Academy', nameEn: 'Smart Minds Academy',
    address: '45 Road 9, El-Maadi', city: 'Cairo',
    phone: '+20 2 2521 6600', email: 'info@smart-minds.eg', website: 'https://smart-minds.eg',
    description: 'Innovative academy in Maadi focused on critical thinking, digital skills and foreign languages for younger learners.',
    lat: 29.9621, lng: 31.2578,
    admin: { username: 'demo.center.admin4', fullName: 'Mona Tarek', phone: '+20 101 567 8901', email: 'm.tarek@smart-minds.eg' },
    plan: 'Tier 1',
  },
  {
    slug: 'bright-future-center', name: 'Bright Future Center', nameEn: 'Bright Future Center',
    address: 'Zone 6, 6th of October City', city: 'Giza',
    phone: '+20 2 3832 1100', email: 'support@bright-future.eg', website: 'https://bright-future.eg',
    description: 'Community-focused center in 6th of October City offering exam preparation and after-school academic support.',
    lat: 29.9731, lng: 30.9169,
    admin: { username: 'demo.center.admin5', fullName: 'Omar Khaled', phone: '+20 109 678 9012', email: 'o.khaled@bright-future.eg' },
    plan: 'Tier 2',
  },
];

interface TeacherSeed {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  primaryCenterSlug: string; // center where they show in public search
  subjects: string[];
  grades: string[];
  yearsExperience: number;
  hourlyRate: number;
  locations: string[];       // location names at primary center
  availability: { day: number; startTime: string; endTime: string }[];
}

const TEACHERS: TeacherSeed[] = [
  {
    username: 'demo.teacher.1', fullName: 'Ahmed Hassan', email: 'ahmed.hassan@nile-education.eg', phone: '+20 111 111 1111',
    bio: 'Mathematics specialist with 8 years of experience preparing students for secondary exams.',
    primaryCenterSlug: 'nile-education-center',
    subjects: ['Mathematics'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary'],
    yearsExperience: 8, hourlyRate: 200,
    locations: ['Cairo Branch', 'Giza Branch'],
    availability: [
      { day: WD_SUN, startTime: '10:00', endTime: '11:00' },
      { day: WD_SUN, startTime: '12:00', endTime: '13:00' },
      { day: WD_MON, startTime: '14:00', endTime: '15:00' },
      { day: WD_WED, startTime: '16:00', endTime: '17:00' },
    ],
  },
  {
    username: 'demo.mohamed.ali', fullName: 'Mohamed Ali', email: 'mohamed.ali@excellence-learning.eg', phone: '+20 122 222 2222',
    bio: 'Physics teacher known for clear, intuitive explanations and hands-on problem solving.',
    primaryCenterSlug: 'excellence-learning-center',
    subjects: ['Physics'], grades: ['Grade 2 Primary', 'Grade 3 Primary', 'Grade 1 Preparatory'],
    yearsExperience: 6, hourlyRate: 180,
    locations: ['Dokki Branch'],
    availability: [
      { day: WD_TUE, startTime: '14:00', endTime: '15:00' },
      { day: WD_TUE, startTime: '17:00', endTime: '18:00' },
      { day: WD_THU, startTime: '16:00', endTime: '17:00' },
    ],
  },
  {
    username: 'demo.teacher.2', fullName: 'Sara Mostafa', email: 'sara.mostafa@future-academy.eg', phone: '+20 133 333 3333',
    bio: 'English and French language teacher with international exam preparation experience.',
    primaryCenterSlug: 'future-academy',
    subjects: ['English', 'French'], grades: ['Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary', 'Grade 1 Preparatory'],
    yearsExperience: 7, hourlyRate: 160,
    locations: ['Nasr City Branch'],
    availability: [
      { day: WD_SAT, startTime: '10:00', endTime: '11:00' },
      { day: WD_MON, startTime: '16:00', endTime: '17:00' },
      { day: WD_MON, startTime: '18:00', endTime: '19:00' },
    ],
  },
  {
    username: 'demo.fatma.yousef', fullName: 'Fatma Yousef', email: 'fatma.yousef@nile-education.eg', phone: '+20 144 444 4444',
    bio: 'PhD in Chemistry, passionate about making chemistry approachable and fun.',
    primaryCenterSlug: 'nile-education-center',
    subjects: ['Chemistry', 'Biology'], grades: ['Grade 2 Preparatory', 'Grade 3 Preparatory', 'Grade 1 Secondary'],
    yearsExperience: 11, hourlyRate: 220,
    locations: ['Cairo Branch'],
    availability: [
      { day: WD_SUN, startTime: '14:00', endTime: '15:00' },
      { day: WD_WED, startTime: '17:00', endTime: '18:00' },
    ],
  },
  {
    username: 'demo.omar.salem', fullName: 'Omar Salem', email: 'omar.salem@smart-minds.eg', phone: '+20 155 555 5555',
    bio: 'Computer Science teacher specializing in programming fundamentals and logic for young learners.',
    primaryCenterSlug: 'smart-minds-academy',
    subjects: ['Computer Science'], grades: ['Grade 5 Primary', 'Grade 6 Primary', 'Grade 1 Preparatory'],
    yearsExperience: 4, hourlyRate: 150,
    locations: ['Maadi Branch'],
    availability: [
      { day: WD_THU, startTime: '12:00', endTime: '13:00' },
      { day: WD_THU, startTime: '15:00', endTime: '16:00' },
    ],
  },
  {
    username: 'demo.khaled.ibrahim', fullName: 'Khaled Ibrahim', email: 'khaled.ibrahim@bright-future.eg', phone: '+20 166 666 6666',
    bio: 'Arabic and Mathematics teacher focused on interactive, engaging lessons for primary students.',
    primaryCenterSlug: 'bright-future-center',
    subjects: ['Arabic', 'Mathematics'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary'],
    yearsExperience: 5, hourlyRate: 140,
    locations: ['October Branch'],
    availability: [
      { day: WD_MON, startTime: '10:00', endTime: '11:00' },
      { day: WD_TUE, startTime: '13:00', endTime: '14:00' },
      { day: WD_THU, startTime: '09:00', endTime: '10:00' },
    ],
  },
  {
    username: 'demo.heba.nabil', fullName: 'Heba Nabil', email: 'heba.nabil@future-academy.eg', phone: '+20 177 777 7777',
    bio: 'Biology and Chemistry teacher bringing real-world science into the classroom.',
    primaryCenterSlug: 'future-academy',
    subjects: ['Biology', 'Chemistry'], grades: ['Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 9, hourlyRate: 210,
    locations: ['Nasr City Branch'],
    availability: [
      { day: WD_SAT, startTime: '16:00', endTime: '17:00' },
      { day: WD_WED, startTime: '14:00', endTime: '15:00' },
      { day: WD_THU, startTime: '17:00', endTime: '18:00' },
    ],
  },
  {
    username: 'demo.amr.fathy', fullName: 'Amr Fathy', email: 'amr.fathy@excellence-learning.eg', phone: '+20 188 888 8888',
    bio: 'Physics specialist with a strong track record in university entrance exam preparation.',
    primaryCenterSlug: 'excellence-learning-center',
    subjects: ['Physics', 'Mathematics'], grades: ['Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 10, hourlyRate: 230,
    locations: ['Dokki Branch'],
    availability: [
      { day: WD_SUN, startTime: '17:00', endTime: '18:00' },
      { day: WD_TUE, startTime: '18:00', endTime: '19:00' },
    ],
  },
  {
    username: 'demo.nour.ali', fullName: 'Nour Ali', email: 'nour.ali@bright-future.eg', phone: '+20 199 999 9999',
    bio: 'English language coach helping primary students build strong reading and writing foundations.',
    primaryCenterSlug: 'bright-future-center',
    subjects: ['English'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary'],
    yearsExperience: 3, hourlyRate: 130,
    locations: ['October Branch'],
    availability: [
      { day: WD_SAT, startTime: '09:00', endTime: '10:00' },
      { day: WD_MON, startTime: '12:00', endTime: '13:00' },
      { day: WD_WED, startTime: '15:00', endTime: '16:00' },
    ],
  },
  {
    username: 'demo.careem.said', fullName: 'Careem Said', email: 'careem.said@smart-minds.eg', phone: '+20 120 102 0304',
    bio: 'Mathematics and Computer Science teacher for secondary students, focused on competitive exam prep.',
    primaryCenterSlug: 'smart-minds-academy',
    subjects: ['Mathematics', 'Computer Science'], grades: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 6, hourlyRate: 190,
    locations: ['Maadi Branch'],
    availability: [
      { day: WD_SUN, startTime: '15:00', endTime: '16:00' },
      { day: WD_MON, startTime: '17:00', endTime: '18:00' },
      { day: WD_THU, startTime: '11:00', endTime: '12:00' },
    ],
  },
];

interface StudentSeed {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  grade: string;
  subjects: string[];
  parentUsername: string;
  primaryCenterSlug: string;
  teacherUsernames: string[];  // teachers they interact with (TeacherStudent)
  centerSlugs: string[];       // centers they are connected to / follow
  followsCenters: string[];    // centers explicitly followed
}

const STUDENTS: StudentSeed[] = [
  {
    username: 'demo.student.1', fullName: 'Omar Mohamed', email: 'omar.mohamed@demo.eg', phone: '+20 100 001 0001',
    grade: 'Grade 1 Primary', subjects: ['Mathematics', 'Arabic'],
    parentUsername: 'demo.parent.1', primaryCenterSlug: 'nile-education-center',
    teacherUsernames: ['demo.teacher.1', 'demo.khaled.ibrahim'],
    centerSlugs: ['nile-education-center', 'bright-future-center'],
    followsCenters: ['nile-education-center', 'bright-future-center'],
  },
  {
    username: 'demo.student.2', fullName: 'Youssef Mansour', email: 'youssef.mansour@demo.eg', phone: '+20 100 002 0002',
    grade: 'Grade 2 Primary', subjects: ['Physics', 'Mathematics'],
    parentUsername: 'demo.parent.2', primaryCenterSlug: 'excellence-learning-center',
    teacherUsernames: ['demo.mohamed.ali', 'demo.khaled.ibrahim'],
    centerSlugs: ['excellence-learning-center', 'bright-future-center'],
    followsCenters: ['excellence-learning-center'],
  },
  {
    username: 'demo.student.3', fullName: 'Laila Samir', email: 'laila.samir@demo.eg', phone: '+20 100 003 0003',
    grade: 'Grade 5 Primary', subjects: ['English', 'Computer Science'],
    parentUsername: 'demo.parent.1', primaryCenterSlug: 'smart-minds-academy',
    teacherUsernames: ['demo.omar.salem', 'demo.sara.mostafa'],
    centerSlugs: ['smart-minds-academy', 'future-academy'],
    followsCenters: ['smart-minds-academy'],
  },
  {
    username: 'demo.student.4', fullName: 'Mariam Adel', email: 'mariam.adel@demo.eg', phone: '+20 100 004 0004',
    grade: 'Grade 3 Secondary', subjects: ['Biology', 'Chemistry'],
    parentUsername: 'demo.parent.3', primaryCenterSlug: 'future-academy',
    teacherUsernames: ['demo.heba.nabil', 'demo.amr.fathy'],
    centerSlugs: ['future-academy', 'excellence-learning-center'],
    followsCenters: ['future-academy', 'excellence-learning-center'],
  },
  {
    username: 'demo.student.5', fullName: 'Hassan Tarek', email: 'hassan.tarek@demo.eg', phone: '+20 100 005 0005',
    grade: 'Grade 3 Primary', subjects: ['English', 'Mathematics'],
    parentUsername: 'demo.parent.2', primaryCenterSlug: 'bright-future-center',
    teacherUsernames: ['demo.khaled.ibrahim', 'demo.nour.ali'],
    centerSlugs: ['bright-future-center', 'nile-education-center'],
    followsCenters: ['bright-future-center'],
  },
  {
    username: 'demo.student.6', fullName: 'Salma Hany', email: 'salma.hany@demo.eg', phone: '+20 100 006 0006',
    grade: 'Grade 2 Secondary', subjects: ['Physics', 'Mathematics'],
    parentUsername: 'demo.parent.3', primaryCenterSlug: 'smart-minds-academy',
    teacherUsernames: ['demo.careem.said', 'demo.amr.fathy'],
    centerSlugs: ['smart-minds-academy', 'excellence-learning-center'],
    followsCenters: ['smart-minds-academy'],
  },
  {
    username: 'demo.student.7', fullName: 'Mustafa Adel', email: 'mustafa.adel@demo.eg', phone: '+20 100 007 0007',
    grade: 'Grade 1 Secondary', subjects: ['Chemistry', 'Biology'],
    parentUsername: 'demo.parent.4', primaryCenterSlug: 'nile-education-center',
    teacherUsernames: ['demo.fatma.yousef'],
    centerSlugs: ['nile-education-center'],
    followsCenters: ['nile-education-center'],
  },
  {
    username: 'demo.student.8', fullName: 'Farida Nabil', email: 'farida.nabil@demo.eg', phone: '+20 100 008 0008',
    grade: 'Grade 6 Primary', subjects: ['English', 'French'],
    parentUsername: 'demo.parent.4', primaryCenterSlug: 'future-academy',
    teacherUsernames: ['demo.sara.mostafa'],
    centerSlugs: ['future-academy', 'smart-minds-academy'],
    followsCenters: ['future-academy'],
  },
  {
    username: 'demo.student.9', fullName: 'Kareem Samy', email: 'kareem.samy@demo.eg', phone: '+20 100 009 0009',
    grade: 'Grade 2 Preparatory', subjects: ['Physics', 'Biology'],
    parentUsername: 'demo.parent.5', primaryCenterSlug: 'excellence-learning-center',
    teacherUsernames: ['demo.mohamed.ali', 'demo.sara.mostafa'],
    centerSlugs: ['excellence-learning-center', 'future-academy'],
    followsCenters: ['excellence-learning-center'],
  },
  {
    username: 'demo.student.10', fullName: 'Nada Waleed', email: 'nada.waleed@demo.eg', phone: '+20 100 010 0010',
    grade: 'Grade 3 Secondary', subjects: ['Mathematics', 'Computer Science'],
    parentUsername: 'demo.parent.5', primaryCenterSlug: 'smart-minds-academy',
    teacherUsernames: ['demo.careem.said', 'demo.amr.fathy'],
    centerSlugs: ['smart-minds-academy', 'excellence-learning-center'],
    followsCenters: ['smart-minds-academy', 'excellence-learning-center'],
  },
];

const PARENTS = [
  { username: 'demo.parent.1', fullName: 'Mr. Mohamed Hassan', email: 'parent1@demo.eg', phone: '+20 110 001 0001', centerSlug: 'nile-education-center' },
  { username: 'demo.parent.2', fullName: 'Mrs. Amina Mansour', email: 'parent2@demo.eg', phone: '+20 110 002 0002', centerSlug: 'bright-future-center' },
  { username: 'demo.parent.3', fullName: 'Mr. Adel Samir', email: 'parent3@demo.eg', phone: '+20 110 003 0003', centerSlug: 'future-academy' },
  { username: 'demo.parent.4', fullName: 'Mrs. Salwa Hany', email: 'parent4@demo.eg', phone: '+20 110 004 0004', centerSlug: 'nile-education-center' },
  { username: 'demo.parent.5', fullName: 'Mr. Waleed Samy', email: 'parent5@demo.eg', phone: '+20 110 005 0005', centerSlug: 'smart-minds-academy' },
];

/**
 * A booking/lesson. weekDay offsets are used to place the lesson on a weekday
 * that exists in the teacher's availability so it is bookable / consistent.
 */
interface LessonSeed {
  teacherUsername: string;
  studentUsername: string;      // null => group lesson
  subject: string;
  centerSlug: string;
  weekDay: number;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  offsetDays: number;           // 0 => this week, >= 1 future, <0 past
}

const LESSONS: LessonSeed[] = [
  // A student with MULTIPLE teachers and MULTIPLE centers:
  { teacherUsername: 'demo.teacher.1', studentUsername: 'demo.student.1', subject: 'Mathematics', centerSlug: 'nile-education-center', weekDay: WD_SUN, startTime: '10:00', endTime: '11:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.khaled.ibrahim', studentUsername: 'demo.student.1', subject: 'Arabic', centerSlug: 'bright-future-center', weekDay: WD_MON, startTime: '10:00', endTime: '11:00', status: 'SCHEDULED', offsetDays: 0 },
  { teacherUsername: 'demo.teacher.1', studentUsername: 'demo.student.1', subject: 'Mathematics', centerSlug: 'nile-education-center', weekDay: WD_WED, startTime: '16:00', endTime: '17:00', status: 'SCHEDULED', offsetDays: 7 },

  { teacherUsername: 'demo.mohamed.ali', studentUsername: 'demo.student.2', subject: 'Physics', centerSlug: 'excellence-learning-center', weekDay: WD_TUE, startTime: '14:00', endTime: '15:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.khaled.ibrahim', studentUsername: 'demo.student.2', subject: 'Mathematics', centerSlug: 'bright-future-center', weekDay: WD_THU, startTime: '09:00', endTime: '10:00', status: 'SCHEDULED', offsetDays: 0 },

  { teacherUsername: 'demo.omar.salem', studentUsername: 'demo.student.3', subject: 'Computer Science', centerSlug: 'smart-minds-academy', weekDay: WD_THU, startTime: '15:00', endTime: '16:00', status: 'COMPLETED', offsetDays: -14 },
  { teacherUsername: 'demo.sara.mostafa', studentUsername: 'demo.student.3', subject: 'English', centerSlug: 'future-academy', weekDay: WD_MON, startTime: '16:00', endTime: '17:00', status: 'SCHEDULED', offsetDays: 7 },

  { teacherUsername: 'demo.heba.nabil', studentUsername: 'demo.student.4', subject: 'Biology', centerSlug: 'future-academy', weekDay: WD_WED, startTime: '14:00', endTime: '15:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.amr.fathy', studentUsername: 'demo.student.4', subject: 'Physics', centerSlug: 'excellence-learning-center', weekDay: WD_SUN, startTime: '17:00', endTime: '18:00', status: 'SCHEDULED', offsetDays: 14 },

  { teacherUsername: 'demo.khaled.ibrahim', studentUsername: 'demo.student.5', subject: 'Mathematics', centerSlug: 'bright-future-center', weekDay: WD_TUE, startTime: '13:00', endTime: '14:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.nour.ali', studentUsername: 'demo.student.5', subject: 'English', centerSlug: 'bright-future-center', weekDay: WD_MON, startTime: '12:00', endTime: '13:00', status: 'CANCELLED', offsetDays: -7 },

  { teacherUsername: 'demo.careem.said', studentUsername: 'demo.student.6', subject: 'Mathematics', centerSlug: 'smart-minds-academy', weekDay: WD_MON, startTime: '17:00', endTime: '18:00', status: 'COMPLETED', offsetDays: -3 },
  { teacherUsername: 'demo.amr.fathy', studentUsername: 'demo.student.6', subject: 'Physics', centerSlug: 'excellence-learning-center', weekDay: WD_TUE, startTime: '18:00', endTime: '19:00', status: 'SCHEDULED', offsetDays: 0 },

  { teacherUsername: 'demo.fatma.yousef', studentUsername: 'demo.student.7', subject: 'Chemistry', centerSlug: 'nile-education-center', weekDay: WD_SUN, startTime: '14:00', endTime: '15:00', status: 'COMPLETED', offsetDays: -7 },

  { teacherUsername: 'demo.sara.mostafa', studentUsername: 'demo.student.8', subject: 'French', centerSlug: 'future-academy', weekDay: WD_SAT, startTime: '10:00', endTime: '11:00', status: 'SCHEDULED', offsetDays: 0 },

  { teacherUsername: 'demo.mohamed.ali', studentUsername: 'demo.student.9', subject: 'Physics', centerSlug: 'excellence-learning-center', weekDay: WD_THU, startTime: '16:00', endTime: '17:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.sara.mostafa', studentUsername: 'demo.student.9', subject: 'English', centerSlug: 'future-academy', weekDay: WD_SAT, startTime: '10:00', endTime: '11:00', status: 'SCHEDULED', offsetDays: 14 },

  { teacherUsername: 'demo.careem.said', studentUsername: 'demo.student.10', subject: 'Mathematics', centerSlug: 'smart-minds-academy', weekDay: WD_SUN, startTime: '15:00', endTime: '16:00', status: 'COMPLETED', offsetDays: -7 },
  { teacherUsername: 'demo.amr.fathy', studentUsername: 'demo.student.10', subject: 'Physics', centerSlug: 'excellence-learning-center', weekDay: WD_TUE, startTime: '18:00', endTime: '19:00', status: 'SCHEDULED', offsetDays: 0 },
];

const ASSIGNMENTS: {
  teacherUsername: string; subject: string; centerSlug: string; title: string; description: string;
  deadlineOffsetDays: number; studentUsernames: string[]; submissions: { studentUsername: string; status: string; grade?: number; feedback?: string; late?: boolean }[];
}[] = [
  {
    teacherUsername: 'demo.teacher.1', subject: 'Mathematics', centerSlug: 'nile-education-center',
    title: 'Algebra Practice - Week 3', description: 'Solve the algebra practice problems covering basic equations and word problems.',
    deadlineOffsetDays: 4, studentUsernames: ['demo.student.1'],
    submissions: [
      { studentUsername: 'demo.student.1', status: 'GRADED', grade: 18, feedback: 'Good work. Review question 7.' },
    ],
  },
  {
    teacherUsername: 'demo.mohamed.ali', subject: 'Physics', centerSlug: 'excellence-learning-center',
    title: "Newton's Laws Assignment", description: 'Answer the questions on Newton\'s three laws of motion with real-life examples.',
    deadlineOffsetDays: 5, studentUsernames: ['demo.student.2', 'demo.student.9'],
    submissions: [
      { studentUsername: 'demo.student.2', status: 'SUBMITTED' },
      /* demo.student.9: NOT_SUBMITTED */
    ],
  },
  {
    teacherUsername: 'demo.fatma.yousef', subject: 'Chemistry', centerSlug: 'nile-education-center',
    title: 'Chemical Reactions Homework', description: 'Complete the balancing equations and reaction-type exercises in chapter 5.',
    deadlineOffsetDays: 6, studentUsernames: ['demo.student.7'],
    submissions: [
      { studentUsername: 'demo.student.7', status: 'GRADED', grade: 16, feedback: 'Nice job! Double-check the coefficients in reaction 3.' },
    ],
  },
  {
    teacherUsername: 'demo.sara.mostafa', subject: 'English', centerSlug: 'future-academy',
    title: 'Grammar Exercise', description: 'Complete the grammar exercise on verb tenses and prepositions.',
    deadlineOffsetDays: 3, studentUsernames: ['demo.student.3', 'demo.student.8', 'demo.student.9'],
    submissions: [
      { studentUsername: 'demo.student.3', status: 'DESCRIPTION_SUBMITTED' },
    ],
  },
  {
    teacherUsername: 'demo.omar.salem', subject: 'Computer Science', centerSlug: 'smart-minds-academy',
    title: 'Scratch Project - Animation', description: 'Create a simple animation using Scratch and explain your logic.',
    deadlineOffsetDays: 8, studentUsernames: ['demo.student.3'],
    submissions: [],
  },
  {
    teacherUsername: 'demo.careem.said', subject: 'Mathematics', centerSlug: 'smart-minds-academy',
    title: 'Functions & Limits', description: 'Practice problems on functions, domain/range and basic limits.',
    deadlineOffsetDays: 2, studentUsernames: ['demo.student.6', 'demo.student.10'],
    submissions: [
      { studentUsername: 'demo.student.6', status: 'LATE', late: true, grade: 14, feedback: 'Good attempt, please review limits.' },
    ],
  },
];

const EXAMS: {
  teacherUsername: string; subject: string; centerSlug: string; name: string; description: string;
  offsetDays: number; durationMinutes: number; questions: { type: string; question: string; options?: string[]; correctAnswer?: string; points: number; order: number }[];
  studentUsernames: string[];
}[] = [
  {
    teacherUsername: 'demo.teacher.1', subject: 'Mathematics', centerSlug: 'nile-education-center',
    name: 'Mathematics Midterm', description: 'Midterm covering algebra fundamentals.', offsetDays: -10, durationMinutes: 60,
    studentUsernames: ['demo.student.1'],
    questions: [
      { type: 'MULTIPLE_CHOICE', question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctAnswer: '4', points: 5, order: 0 },
      { type: 'MULTIPLE_CHOICE', question: 'If x + 3 = 10, what is x?', options: ['5', '6', '7', '8'], correctAnswer: '7', points: 5, order: 1 },
      { type: 'TRUE_FALSE', question: 'An even number is divisible by 2.', correctAnswer: 'true', points: 5, order: 2 },
    ],
  },
  {
    teacherUsername: 'demo.mohamed.ali', subject: 'Physics', centerSlug: 'excellence-learning-center',
    name: 'Physics Monthly Exam', description: 'Monthly exam on force and motion.', offsetDays: -7, durationMinutes: 45,
    studentUsernames: ['demo.student.2', 'demo.student.9'],
    questions: [
      { type: 'MULTIPLE_CHOICE', question: 'Force equals mass times what?', options: ['Velocity', 'Acceleration', 'Distance', 'Time'], correctAnswer: 'Acceleration', points: 5, order: 0 },
      { type: 'TRUE_FALSE', question: 'Friction always opposes motion.', correctAnswer: 'true', points: 5, order: 1 },
    ],
  },
  {
    teacherUsername: 'demo.sara.mostafa', subject: 'English', centerSlug: 'future-academy',
    name: 'English Grammar Test', description: 'Test on verb tenses and sentence structure.', offsetDays: -5, durationMinutes: 30,
    studentUsernames: ['demo.student.8', 'demo.student.3'],
    questions: [
      { type: 'MULTIPLE_CHOICE', question: 'Choose the correct be verb: "She ___ a teacher."', options: ['am', 'is', 'are', 'be'], correctAnswer: 'is', points: 5, order: 0 },
      { type: 'TRUE_FALSE', question: 'Adjectives describe nouns.', correctAnswer: 'true', points: 5, order: 1 },
    ],
  },
];

const CENTER_BROADCASTS: { type: 'teachers' | 'students'; centerSlug: string; title: string; message: string; grade?: string }[] = [
  { type: 'teachers', centerSlug: 'nile-education-center', title: 'Schedule Update', message: "Tomorrow's schedule has been updated. Please check your availability." },
  { type: 'students', centerSlug: 'nile-education-center', grade: 'Grade 1 Primary', title: 'Exam Notice', message: 'Grade 1 Mathematics exam will be held on Sunday.' },
  { type: 'students', centerSlug: 'excellence-learning-center', grade: 'Grade 2 Primary', title: 'Reminder', message: 'Please bring your assignment notebook tomorrow.' },
];

const TEACHER_BROADCASTS: { teacherUsername: string; title: string; message: string; studentUsernames: string[] }[] = [
  { teacherUsername: 'demo.teacher.1', title: 'Chapter 4', message: 'Please complete Chapter 4 before our next lesson.', studentUsernames: ['demo.student.1'] },
  { teacherUsername: 'demo.mohamed.ali', title: 'Homework Uploaded', message: 'New Physics homework has been uploaded.', studentUsernames: ['demo.student.2', 'demo.student.9'] },
];

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------
const centerById: Record<string, any> = {};
const teacherByUsername: Record<string, any> = {};
const studentByUsername: Record<string, any> = {};
const userByUsername: Record<string, any> = {};
const subjectByName: Record<string, any> = {};
const gradeByName: Record<string, any> = {};
const locationByCenterName: Record<string, any> = {};

async function ensureSubjectsAndGrades() {
  for (const name of SUBJECTS) {
    const s = await prisma.subject.upsert({ where: { name }, create: { name }, update: {} });
    subjectByName[name] = s;
  }
  for (const [i, name] of GRADES.entries()) {
    const g = await prisma.grade.upsert({ where: { name }, create: { name, level: Math.floor(i / 3) + 1 }, update: {} });
    gradeByName[name] = g;
  }
}

async function ensureSuperAdmin() {
  const hash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { username: 'demo.super.admin' },
    create: { username: 'demo.super.admin', passwordHash: hash, fullName: 'Demo Super Admin', phone: '+20 111 000 0000', email: 'demo.super.admin@demo.eg', role: 'SUPER_ADMIN', status: 'ACTIVE' },
    update: { passwordHash: hash, status: 'ACTIVE' },
  });
  userByUsername[user.username] = user;
}

/**
 * CENTER subscription plans referenced by the demo centers. These mirror the
 * platform plan catalog (see seed.ts) so demo centers have a real, active plan.
 * Without a plan, feature-lock guards (assignments, exams, ...) return 402 `FEATURE_LOCKED`
 * for every demo account. Upserted idempotently by unique plan name; never deletes.
 */
const CENTER_PLANS: {
  name: string; description: string; priceMonthly: number; type: 'CENTER'; billingPeriod: 'MONTHLY';
  maxTeachers: number | null; maxStudents: number | null; maxEmployees: number | null;
  maxAssistants: number | null; maxRooms: number | null; commissionRate: number;
  includesChat: boolean; includesExams: boolean; includesAssignments: boolean;
  includesAttendance: boolean; includesPayments: boolean; includesAnalytics: boolean;
  includesMultiBranch: boolean;
}[] = [
  {
    name: 'Tier 1', description: 'Plan for growing education centers.', priceMonthly: 600,
    type: 'CENTER', billingPeriod: 'MONTHLY', maxTeachers: 6, maxStudents: 60, maxEmployees: 2,
    maxAssistants: 2, maxRooms: 4, commissionRate: 0.05,
    includesChat: true, includesExams: true, includesAssignments: true,
    includesAttendance: true, includesPayments: true, includesAnalytics: false, includesMultiBranch: false,
  },
  {
    name: 'Tier 2', description: 'Plan for medium education centers.', priceMonthly: 1000,
    type: 'CENTER', billingPeriod: 'MONTHLY', maxTeachers: 12, maxStudents: 150, maxEmployees: 5,
    maxAssistants: 5, maxRooms: 8, commissionRate: 0.04,
    includesChat: true, includesExams: true, includesAssignments: true,
    includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: false,
  },
  {
    name: 'Tier 3', description: 'Plan for large education centers.', priceMonthly: 1800,
    type: 'CENTER', billingPeriod: 'MONTHLY', maxTeachers: 25, maxStudents: 400, maxEmployees: 10,
    maxAssistants: 10, maxRooms: 15, commissionRate: 0.03,
    includesChat: true, includesExams: true, includesAssignments: true,
    includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: false,
  },
];

let demoPlans: Record<string, { id: string }> = {};

async function ensurePlans() {
  for (const p of CENTER_PLANS) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name: p.name },
      create: { ...p, isActive: true },
      update: { isActive: true },
    });
    demoPlans[p.name] = { id: plan.id };
  }
}

async function ensureCenters() {
  for (const c of CENTERS) {
    // Resolve the center's plan: prefer the exact demo plan, then any active CENTER plan.
    let plan = demoPlans[c.plan] ? { id: demoPlans[c.plan].id } : null;
    if (!plan) {
      const found = await prisma.subscriptionPlan.findFirst({ where: { type: 'CENTER', isActive: true }, orderBy: { priceMonthly: 'asc' } });
      plan = found ? { id: found.id } : null;
    }
    const center = await prisma.center.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name, nameEn: c.nameEn, slug: c.slug, address: c.address, city: c.city,
        latitude: c.lat, longitude: c.lng, phone: c.phone, email: c.email, website: c.website,
        description: c.description, status: 'ACTIVE', subscriptionStatus: 'ACTIVE', requiresApproval: false,
        planId: plan?.id ?? null, subscriptionStartsAt: new Date(Date.now() - 90 * 86400000),
        subscriptionExpiresAt: new Date(Date.now() + 270 * 86400000),
      },
      update: {
        name: c.name, nameEn: c.nameEn, address: c.address, city: c.city,
        latitude: c.lat, longitude: c.lng, phone: c.phone, email: c.email,
        description: c.description, status: 'ACTIVE', subscriptionStatus: 'ACTIVE', requiresApproval: false,
        planId: plan?.id ?? null,
      },
    });

    await prisma.centerSettings.upsert({
      where: { centerId: center.id },
      create: { centerId: center.id, name: c.name, timezone: 'Africa/Cairo', currency: 'EGP', latitude: c.lat, longitude: c.lng },
      update: { latitude: c.lat, longitude: c.lng },
    });

    // Locations (branches) for the center.
    const branchNames = c.name === 'Nile Education Center'
      ? [{ name: 'Cairo Branch', address: '90 Rd 90, Fifth Settlement' }, { name: 'Giza Branch', address: '12 El-Haram St, Giza' }]
      : [{ name: c.slug.includes('future') ? 'Nasr City Branch' : c.slug.includes('excellence') ? 'Dokki Branch' : c.slug.includes('smart') ? 'Maadi Branch' : 'October Branch', address: c.address }];
    const locs: any = {};
    for (const b of branchNames) {
      const loc = await prisma.location.upsert({
        where: { centerId_name: { centerId: center.id, name: b.name } },
        create: { centerId: center.id, name: b.name, address: b.address },
        update: { address: b.address },
      });
      locs[b.name] = loc;
    }
    locationByCenterName[c.name] = locs;
    centerById[center.id] = center;
  }
}

async function ensureCenterAdmins() {
  for (const c of CENTERS) {
    const center = await prisma.center.findUnique({ where: { slug: c.slug } });
    if (!center) continue;
    const hash = await hashPassword(DEMO_PASSWORD);
    const user = await prisma.user.upsert({
      where: { username: c.admin.username },
      create: {
        username: c.admin.username, passwordHash: hash, fullName: c.admin.fullName, phone: c.admin.phone,
        email: c.admin.email, role: 'CENTER_ADMIN' as Role, status: 'ACTIVE', centerId: center.id,
        phoneE164: c.admin.phone, phoneVerified: true, phoneVerifiedAt: new Date(),
      },
      update: { passwordHash: hash, fullName: c.admin.fullName, role: 'CENTER_ADMIN' as Role, status: 'ACTIVE', centerId: center.id },
    });
    userByUsername[user.username] = user;
  }
}

async function ensureParents() {
  for (const p of PARENTS) {
    const center = await prisma.center.findUnique({ where: { slug: p.centerSlug } });
    const hash = await hashPassword(DEMO_PASSWORD);
    const user = await prisma.user.upsert({
      where: { username: p.username },
      create: {
        username: p.username, passwordHash: hash, fullName: p.fullName, phone: p.phone, email: p.email,
        role: 'PARENT' as Role, status: 'ACTIVE', centerId: center?.id ?? null,
        phoneE164: p.phone, phoneVerified: true, phoneVerifiedAt: new Date(),
      },
      update: { passwordHash: hash, fullName: p.fullName, role: 'PARENT' as Role, status: 'ACTIVE', centerId: center?.id ?? null },
    });
    userByUsername[user.username] = user;
    await prisma.parent.upsert({
      where: { userId: user.id },
      create: { userId: user.id, centerId: center?.id ?? null },
      update: { centerId: center?.id ?? null },
    });
  }
}

async function ensureTeachers() {
  for (const t of TEACHERS) {
    const center = await prisma.center.findUnique({ where: { slug: t.primaryCenterSlug } });
    if (!center) continue;
    const hash = await hashPassword(DEMO_PASSWORD);
    const user = await prisma.user.upsert({
      where: { username: t.username },
      create: {
        username: t.username, passwordHash: hash, fullName: t.fullName, phone: t.phone, email: t.email,
        role: 'TEACHER' as Role, status: 'ACTIVE', centerId: center.id,
        phoneE164: t.phone, phoneVerified: true, phoneVerifiedAt: new Date(),
      },
      update: { passwordHash: hash, fullName: t.fullName, role: 'TEACHER' as Role, status: 'ACTIVE', centerId: center.id },
    });
    userByUsername[user.username] = user;

    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, centerId: center.id, bio: t.bio, yearsExperience: t.yearsExperience, hourlyRate: t.hourlyRate,
      },
      update: { centerId: center.id, bio: t.bio, yearsExperience: t.yearsExperience, hourlyRate: t.hourlyRate },
    });
    teacherByUsername[t.username] = teacher;

    // Subjects & grades (recreate to guarantee consistency).
    await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.teacherGrade.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.teacherSubject.createMany({
      data: t.subjects.map((n) => ({ teacherId: teacher.id, subjectId: subjectByName[n].id })),
      skipDuplicates: true,
    });
    await prisma.teacherGrade.createMany({
      data: t.grades.map((n) => ({ teacherId: teacher.id, gradeId: gradeByName[n].id })),
      skipDuplicates: true,
    });

    // Availability (idempotent by exact tuple).
    const existing = await prisma.teacherAvailability.findMany({ where: { teacherId: teacher.id } });
    const existingKey = new Set(existing.map((a) => `${a.day}|${a.startTime}|${a.endTime}`));
    for (const a of t.availability) {
      const key = `${a.day}|${a.startTime}|${a.endTime}`;
      if (existingKey.has(key)) continue;
      await prisma.teacherAvailability.create({
        data: { teacherId: teacher.id, day: a.day, startTime: a.startTime, endTime: a.endTime },
      });
    }

    // Payment settings (idempotent).
    await prisma.teacherPaymentSettings.upsert({
      where: { teacherId: teacher.id },
      create: { teacherId: teacher.id, sessionEnabled: true, monthlyEnabled: true, sessionPrice: t.hourlyRate, monthlyPrice: t.hourlyRate * 8, vodafoneCash: '0100 000 0000', instaPay: 'demo@instapay.eg' },
      update: { sessionPrice: t.hourlyRate },
    });

    // Wallet for teacher.
    await ensureWallet(user.id, center.id, 0);
  }
}

async function ensureStudents() {
  for (const s of STUDENTS) {
    const center = await prisma.center.findUnique({ where: { slug: s.primaryCenterSlug } });
    const grade = gradeByName[s.grade];
    const hash = await hashPassword(DEMO_PASSWORD);
    const user = await prisma.user.upsert({
      where: { username: s.username },
      create: {
        username: s.username, passwordHash: hash, fullName: s.fullName, phone: s.phone, email: s.email,
        role: 'STUDENT' as Role, status: 'ACTIVE', centerId: center?.id ?? null,
        phoneE164: s.phone, phoneVerified: true, phoneVerifiedAt: new Date(),
      },
      update: { passwordHash: hash, fullName: s.fullName, role: 'STUDENT' as Role, status: 'ACTIVE', centerId: center?.id ?? null },
    });
    userByUsername[user.username] = user;

    // Stable, unique student number (deterministic per demo student).
    const existingUser = await prisma.student.findUnique({ where: { userId: user.id } });
    let studentNumber = existingUser?.studentNumber ?? '';
    if (!studentNumber) {
      const candidateBase = `STU-DEMO-${String(STUDENTS.indexOf(s) + 1).padStart(3, '0')}`;
      if (!(await prisma.student.findUnique({ where: { studentNumber: candidateBase } }))) {
        studentNumber = candidateBase;
      } else {
        studentNumber = `${candidateBase}-${String(Math.floor(Math.random() * 900) + 100)}`;
      }
    }

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, centerId: center?.id ?? null, gradeId: grade?.id ?? null, studentNumber,
      },
      update: { centerId: center?.id ?? null, gradeId: grade?.id ?? null },
    });
    studentByUsername[s.username] = student;

    // Student subjects.
    await prisma.studentSubject.deleteMany({ where: { studentId: student.id } });
    await prisma.studentSubject.createMany({
      data: s.subjects.map((n) => ({ studentId: student.id, subjectId: subjectByName[n].id })),
      skipDuplicates: true,
    });

    // Teacher <-> student links (multi-teacher).
    for (const tu of s.teacherUsernames) {
      const teacher = teacherByUsername[tu];
      if (!teacher) continue;
      await prisma.teacherStudent.upsert({
        where: { teacherId_studentId: { teacherId: teacher.id, studentId: student.id } },
        create: { teacherId: teacher.id, studentId: student.id },
        update: {},
      });
    }

    // Parent <-> student links.
    if (s.parentUsername) {
      const parentUser = userByUsername[s.parentUsername];
      const parent = parentUser ? await prisma.parent.findUnique({ where: { userId: parentUser.id } }) : null;
      if (parent) {
        await prisma.parentStudent.upsert({
          where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
          create: { parentId: parent.id, studentId: student.id },
          update: {},
        });
      }
    }

    // Multi-center follows.
    for (const slug of s.followsCenters) {
      const fc = await prisma.center.findUnique({ where: { slug } });
      if (!fc) continue;
      await prisma.studentCenterFollow.upsert({
        where: { studentId_centerId: { studentId: student.id, centerId: fc.id } },
        create: { studentId: student.id, centerId: fc.id },
        update: {},
      });
    }

    await ensureWallet(user.id, center?.id ?? null, 500);
  }
}

async function ensureWallet(userId: string, centerId: string | null, balance: number) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId, centerId, balance, status: 'ACTIVE' } });
}

async function ensureLessons() {
  let count = 0;
  for (const l of LESSONS) {
    const teacher = teacherByUsername[l.teacherUsername];
    const student = l.studentUsername ? studentByUsername[l.studentUsername] : null;
    const center = await prisma.center.findUnique({ where: { slug: l.centerSlug } });
    const subject = subjectByName[l.subject];
    if (!teacher || !center || !subject) continue;
    if (l.studentUsername && !student) continue;

    // Place the lesson on a weekday matching one of the teacher's availability.
    const date = nextWeekday(l.weekDay, l.offsetDays);
    // Guard: only create if not already existing for this teacher+student+date+start.
    const existing = await prisma.lesson.findFirst({
      where: { teacherId: teacher.id, date, startTime: l.startTime, ...(student ? { studentId: student.id } : { studentId: null }) },
    });
    if (existing) { count++; continue; }

    await prisma.lesson.create({
      data: {
        teacherId: teacher.id, studentId: student?.id ?? null, centerId: center.id, subjectId: subject.id,
        date, startTime: l.startTime, endTime: l.endTime, status: l.status,
        notes: `${subject.name} lesson`,
      },
    });
    count++;
  }
  console.log(`Lessons ensured: ${count}`);
}

async function ensureLessonAvailabilityConsistency() {
  // Nothing to do here; availability is seeded in ensureTeachers.
}

async function ensureAssignmentsAndSubmissions() {
  for (const a of ASSIGNMENTS) {
    const teacher = teacherByUsername[a.teacherUsername];
    const center = await prisma.center.findUnique({ where: { slug: a.centerSlug } });
    const subject = subjectByName[a.subject];
    if (!teacher || !center || !subject) continue;
    const deadline = new Date(Date.now() + a.deadlineOffsetDays * 86400000);

    // Guard by title+teacher.
    const existing = await prisma.assignment.findFirst({ where: { teacherId: teacher.id, title: a.title } });
    const assignment = existing ?? await prisma.assignment.create({
      data: { teacherId: teacher.id, centerId: center.id, subjectId: subject.id, title: a.title, description: a.description, deadline },
    });

    // Assignment-student targets.
    await prisma.assignmentStudent.createMany({
      data: a.studentUsernames.map((un) => {
        const st = studentByUsername[un];
        return st ? { assignmentId: assignment.id, studentId: st.id } : (null as any);
      }).filter(Boolean),
      skipDuplicates: true,
    });

    // Submissions.
    for (const sub of a.submissions) {
      const st = studentByUsername[sub.studentUsername];
      if (!st) continue;
      const existingSub = await prisma.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: st.id } },
      });
      if (existingSub) continue;
      const status = sub.status === 'DESCRIPTION_SUBMITTED' ? 'SUBMITTED' : (sub.status as any);
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id, studentId: st.id,
          textAnswer: `My work for "${a.title}".`, status,
          submittedAt: new Date(Math.min(Date.now(), deadline.getTime() - 3600000)),
          grade: sub.grade,
          feedback: sub.feedback,
          gradedAt: sub.grade != null ? new Date() : undefined,
        },
      });
    }
  }
}

async function ensureExams() {
  for (const e of EXAMS) {
    const teacher = teacherByUsername[e.teacherUsername];
    const center = await prisma.center.findUnique({ where: { slug: e.centerSlug } });
    const subject = subjectByName[e.subject];
    if (!teacher || !center || !subject) continue;
    const startTime = new Date(Date.now() + e.offsetDays * 86400000);
    const endTime = new Date(startTime.getTime() + e.durationMinutes * 60000);

    const existing = await prisma.exam.findFirst({ where: { teacherId: teacher.id, name: e.name } });
    const exam = existing ?? await prisma.exam.create({
      data: {
        teacherId: teacher.id, centerId: center.id, subjectId: subject.id, name: e.name, description: e.description,
        startTime, endTime, durationMinutes: e.durationMinutes,
      },
    });

    // Questions.
    if (!existing) {
      await prisma.examQuestion.createMany({
        data: e.questions.map((q) => ({
          examId: exam.id, type: q.type as any, question: q.question,
          options: q.options ? JSON.stringify(q.options) : null, correctAnswer: q.correctAnswer ?? null,
          points: q.points, order: q.order,
        })),
        skipDuplicates: true,
      });
    }

    // Student targets.
    await prisma.examStudent.createMany({
      data: e.studentUsernames.map((un) => {
        const st = studentByUsername[un];
        return st ? { examId: exam.id, studentId: st.id } : (null as any);
      }).filter(Boolean),
      skipDuplicates: true,
    });

    // Attempts + answers for graded (past) exams.
    if (e.offsetDays < 0) {
      const questions = await prisma.examQuestion.findMany({ where: { examId: exam.id }, orderBy: { order: 'asc' } });
      for (const un of e.studentUsernames) {
        const st = studentByUsername[un];
        if (!st) continue;
        const exists = await prisma.examAttempt.findUnique({ where: { examId_studentId: { examId: exam.id, studentId: st.id } } });
        if (exists) continue;
        const attempt = await prisma.examAttempt.create({
          data: { examId: exam.id, studentId: st.id, startedAt: startTime, submittedAt: endTime, status: 'SUBMITTED' },
        });
        let score = 0, correct = 0;
        for (const q of questions) {
          const correctAnswer = questions.indexOf(q) % 2 === 0;
          score += correctAnswer ? q.points : 0;
          if (correctAnswer) correct++;
          const answer = correctAnswer ? q.correctAnswer
            : q.type === 'TRUE_FALSE' ? (q.correctAnswer === 'true' ? 'false' : 'true')
            : (q.options ? JSON.parse(q.options)[0] : null);
          await prisma.examAnswer.create({
            data: { attemptId: attempt.id, questionId: q.id, answer, isCorrect: correctAnswer, points: correctAnswer ? q.points : 0 },
          });
        }
        const max = questions.reduce((sum, q) => sum + q.points, 0);
        await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: { score, maxScore: max, percentage: max ? (score / max) * 100 : 0, correctCount: correct, totalCount: questions.length },
        });
      }
    }
  }
}

async function ensureAttendance() {
  // Mark attendance on COMPLETED lessons.
  const completed = await prisma.lesson.findMany({
    where: { status: 'COMPLETED', studentId: { not: null } },
    include: { student: true },
  });
  let count = 0;
  for (const lesson of completed) {
    if (!lesson.studentId) continue;
    const exists = await prisma.attendance.findUnique({
      where: { lessonId_studentId: { lessonId: lesson.id, studentId: lesson.studentId } },
    });
    if (exists) continue;
    const status = count % 5 === 0 ? 'ABSENT' : (count % 4 === 0 ? 'LATE' : 'PRESENT');
    const teacherUser = await prisma.teacher.findUnique({ where: { id: lesson.teacherId } }).then((t) => t?.userId ?? null);
    await prisma.attendance.create({
      data: {
        lessonId: lesson.id, studentId: lesson.studentId, status: status as any, method: 'MANUAL',
        centerId: lesson.centerId, markedBy: teacherUser, markedAt: new Date(lesson.date.getTime() + 60 * 60000),
      },
    });
    count++;
  }
  console.log(`Attendance ensured for ${count} lessons.`);
}

async function ensurePayments() {
  // Payment for completed lessons (SESSION) and monthly subscriptions.
  const lessons = await prisma.lesson.findMany({ where: { status: { in: ['COMPLETED', 'SCHEDULED'] }, studentId: { not: null } } });
  let idx = 0;
  for (const lesson of lessons) {
    if (!lesson.studentId) continue;
    const st = await prisma.student.findUnique({ where: { id: lesson.studentId }, include: { user: true } });
    const teacher = await prisma.teacher.findUnique({ where: { id: lesson.teacherId }, include: { user: true } });
    if (!st || !teacher) continue;
    const paymentNumber = `PMT-DEMO-${String(idx + 1).padStart(5, '0')}`;
    const exists = await prisma.payment.findUnique({ where: { paymentNumber } });
    if (exists) continue;
    const amount = teacher.hourlyRate;
    await prisma.payment.create({
      data: {
        paymentNumber, payerId: st.userId, payerName: st.user.fullName,
        studentId: st.id, teacherId: teacher.id, lessonId: lesson.id, centerId: lesson.centerId,
        amount, currency: 'EGP', type: 'SESSION', method: 'CASH',
        status: lesson.status === 'COMPLETED' ? 'PAID' : 'PENDING',
        paidAt: lesson.status === 'COMPLETED' ? new Date(lesson.date.getTime() + 3600000) : undefined,
      },
    });
    idx++;
  }
  console.log(`Payments ensured: ${idx}`);
}

async function ensureNotificationsAndBroadcasts() {
  let count = 0;
  const helper = async (username: string, type: string, title: string, message: string) => {
    const user = userByUsername[username];
    if (!user) return;
    const exists = await prisma.notification.findFirst({ where: { userId: user.id, title, message } });
    if (exists) return;
    await prisma.notification.create({ data: { userId: user.id, type: type as any, title, message, read: false } });
    count++;
  };

  // Center broadcasts, simulated as targeted notifications.
  for (const b of CENTER_BROADCASTS) {
    const center = await prisma.center.findUnique({ where: { slug: b.centerSlug } });
    if (!center) continue;
    if (b.type === 'teachers') {
      const teachers = await prisma.teacher.findMany({ where: { centerId: center.id } });
      for (const t of teachers) {
        const tu = await prisma.user.findUnique({ where: { id: t.userId } });
        if (tu) await helper(tu.username, 'GENERAL', `[${center.name}] ${b.title}`, `${b.message}`);
      }
    } else {
      // Students (optionally by grade).
      const where: any = { centerId: center.id };
      if (b.grade) {
        const g = gradeByName[b.grade];
        if (g) where.gradeId = g.id;
      }
      const students = await prisma.student.findMany({ where });
      for (const s of students) {
        const su = await prisma.user.findUnique({ where: { id: s.userId } });
        if (su) await helper(su.username, 'GENERAL', `[${center.name}] ${b.title}`, `${b.message}`);
      }
    }
  }

  // Teacher broadcasts -> their students.
  for (const b of TEACHER_BROADCASTS) {
    const teacher = teacherByUsername[b.teacherUsername];
    if (!teacher) continue;
    const tu = userByUsername[b.teacherUsername];
    if (!tu) continue;
    for (const un of b.studentUsernames) {
      const su = userByUsername[un];
      if (su) await helper(un, 'GENERAL', `${tu.fullName}: ${b.title}`, b.message);
    }
  }

  console.log(`Notifications/broadcasts ensured: ${count}`);
}

async function ensureStudentNotifications() {
  let count = 0;
  const helper = async (username: string, type: string, title: string, message: string) => {
    const user = userByUsername[username];
    if (!user) return;
    const exists = await prisma.notification.findFirst({ where: { userId: user.id, title, message } });
    if (exists) return;
    await prisma.notification.create({ data: { userId: user.id, type: type as any, title, message, read: false } });
    count++;
  };
  // Per-student realistic notifications.
  await helper('demo.student.1', 'LESSON_CHANGE', 'Upcoming Mathematics lesson', 'Your Mathematics lesson with Ahmed Hassan is scheduled soon.');
  await helper('demo.student.1', 'GRADED', 'Assignment graded', 'Your Physics assignment has been graded.');
  await helper('demo.student.4', 'LESSON_CHANGE', 'New slot available', 'New lesson slot is available with Mohamed Ali.');
  console.log(`Extra student notifications ensured: ${count}`);
}

async function ensureRatings() {
  // Center ratings.
  const studentsList = Object.values(studentByUsername) as any[];
  const sampleUsers = studentsList.slice(0, 5);
  for (const centerKey of Object.keys(centerById)) {
    const center = centerById[centerKey];
    for (const st of sampleUsers) {
      if (Math.random() < 0.6) continue;
      const owner = await prisma.user.findUnique({ where: { id: st.userId } });
      if (!owner) continue;
      await prisma.centerRating.upsert({
        where: { centerId_userId: { centerId: center.id, userId: owner.id } },
        create: { centerId: center.id, userId: owner.id, stars: 4 + (Math.floor(Math.random() * 2)), comment: 'Great place to learn.' },
        update: {},
      });
    }
  }
  // Teacher ratings by students connected to them.
  for (const [un, teacher] of Object.entries(teacherByUsername) as [string, any][]) {
    const myStudents = await prisma.teacherStudent.findMany({ where: { teacherId: teacher.id }, select: { studentId: true } });
    for (const { studentId } of myStudents) {
      const exists = await prisma.rating.findUnique({ where: { teacherId_studentId: { teacherId: teacher.id, studentId } } });
      if (exists) continue;
      await prisma.rating.create({
        data: { teacherId: teacher.id, studentId, stars: 4 + (Math.floor(Math.random() * 2)), comment: 'Clear and helpful explanations.' },
      });
    }
  }
}

async function ensureConversations() {
  for (const s of STUDENTS) {
    for (const tu of s.teacherUsernames) {
      const teacher = teacherByUsername[tu];
      const student = studentByUsername[s.username];
      if (!teacher || !student) continue;
      const conv = await prisma.conversation.upsert({
        where: { teacherId_studentId: { teacherId: teacher.id, studentId: student.id } },
        create: { teacherId: teacher.id, studentId: student.id, centerId: student.centerId },
        update: {},
      });
      const msgCount = await prisma.message.count({ where: { conversationId: conv.id } });
      if (msgCount === 0) {
        const tuObj = userByUsername[tu];
        const suObj = userByUsername[s.username];
        await prisma.message.create({
          data: { conversationId: conv.id, senderId: suObj.id, senderRole: 'STUDENT', body: `Hello ${tuObj.fullName}, I have a question about our next lesson.` },
        });
        await prisma.message.create({
          data: { conversationId: conv.id, senderId: tuObj.id, senderRole: 'TEACHER', body: `Hi ${suObj.fullName}, sure — ask away!` },
        });
      }
    }
  }
}

async function main() {
  console.log('Seeding realistic demo data...');
  await ensureSubjectsAndGrades();
  await ensureSuperAdmin();
  await ensurePlans();
  await ensureCenters();
  await ensureCenterAdmins();
  await ensureParents();
  await ensureTeachers();
  await ensureStudents();
  await ensureLessons();
  await ensureAssignmentsAndSubmissions();
  await ensureExams();
  await ensureAttendance();
  await ensurePayments();
  await ensureRatings();
  await ensureConversations();
  await ensureNotificationsAndBroadcasts();
  await ensureStudentNotifications();
  await ensureLessonAvailabilityConsistency();

  // ---- Summary ----
  // Run counts sequentially (single connection at a time) so the total doesn't
  // spike past the connection pooler's limit when a live app server is running.
  const counts: Record<string, number> = {};
  const tally: [string, () => Promise<number>][] = [
    ['Centers', () => prisma.center.count()],
    ['Teachers', () => prisma.teacher.count()],
    ['Students', () => prisma.student.count()],
    ['Parents', () => prisma.parent.count()],
    ['Subjects', () => prisma.subject.count()],
    ['Grades', () => prisma.grade.count()],
    ['Availability slots', () => prisma.teacherAvailability.count()],
    ['Lessons (bookings)', () => prisma.lesson.count()],
    ['Assignments', () => prisma.assignment.count()],
    ['Submissions', () => prisma.assignmentSubmission.count()],
    ['Exams', () => prisma.exam.count()],
    ['Attendance records', () => prisma.attendance.count()],
    ['Notifications', () => prisma.notification.count()],
    ['Payments', () => prisma.payment.count()],
  ];
  for (const [label, count] of tally) {
    try { counts[label] = await count(); } catch { counts[label] = -1; }
  }

  const centers = counts['Centers'], teachers = counts['Teachers'], students = counts['Students'],
    parents = counts['Parents'], subjects = counts['Subjects'], grades = counts['Grades'],
    slots = counts['Availability slots'], lessons = counts['Lessons (bookings)'],
    assignments = counts['Assignments'], submissions = counts['Submissions'],
    exams = counts['Exams'], attendance = counts['Attendance records'],
    notifications = counts['Notifications'], payments = counts['Payments'];

  console.log('\n==================================================');
  console.log('DEMO DATA CREATED SUCCESSFULLY');
  console.log('==================================================');
  console.log('Role          | Username             | Password    | Related Center/Info');
  console.log('--------------|----------------------|-------------|----------------------');
  for (const c of CENTERS) {
    console.log(`CENTER ADMIN  | ${c.admin.username} | ${DEMO_PASSWORD} | ${c.name}`);
  }
  for (const t of TEACHERS) {
    console.log(`TEACHER       | ${t.username}           | ${DEMO_PASSWORD} | ${t.subjects.join(', ')} / ${t.primaryCenterSlug}`);
  }
  for (const s of STUDENTS) {
    console.log(`STUDENT       | ${s.username}           | ${DEMO_PASSWORD} | ${s.grade} / ${s.centerSlugs.length} centers`);
  }
  for (const p of PARENTS) {
    console.log(`PARENT        | ${p.username}           | ${DEMO_PASSWORD} | Parent of related students`);
  }
  console.log('\n----------------------------');
  console.log(`Centers: ${centers}`);
  console.log(`Teachers: ${teachers}`);
  console.log(`Students: ${students}`);
  console.log(`Parents: ${parents}`);
  console.log(`Subjects: ${subjects}`);
  console.log(`Grades: ${grades}`);
  console.log(`Availability slots: ${slots}`);
  console.log(`Lessons (bookings): ${lessons}`);
  console.log(`Assignments: ${assignments}`);
  console.log(`Submissions: ${submissions}`);
  console.log(`Exams: ${exams}`);
  console.log(`Attendance records: ${attendance}`);
  console.log(`Notifications: ${notifications}`);
  console.log(`Payments: ${payments}`);
  console.log('==================================================');
}

main()
  .catch((e) => { console.error('Demo seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
