import type {
  PublicCenter,
  PublicCenterTeacher,
  CenterPackage,
  PublicSpace,
} from '../lib/api';
import type {
  AvailabilitySlot,
  Grade,
  Location,
  PublicTeacher,
  Review,
  Subject,
} from '../lib/types';

/* ------------------------------------------------------------------ */
/*  Reference catalog (mirrors the backend seed: English stage-grade    */
/*  names so the browse "stage" filter works the same as production).  */
/* ------------------------------------------------------------------ */

export const SUBJECTS: Subject[] = [
  { id: 'sub-math', name: 'الرياضيات', icon: null, description: 'جبر وهندسة وتفاضل وتكامل' },
  { id: 'sub-physics', name: 'الفيزياء', icon: null, description: 'ميكانيكا وكهربية وفيزياء حديثة' },
  { id: 'sub-chem', name: 'الكيمياء', icon: null, description: 'كيمياء عضوية وغير عضوية' },
  { id: 'sub-bio', name: 'الأحياء', icon: null, description: 'أحياء ونبات وحيوان' },
  { id: 'sub-arabic', name: 'اللغة العربية', icon: null, description: 'نحو وبلاغة وأدب' },
  { id: 'sub-english', name: 'اللغة الإنجليزية', icon: null, description: 'قواعد ومحادثة وكتابة' },
  { id: 'sub-french', name: 'اللغة الفرنسية', icon: null, description: 'قواعد فرنسية ومحادثة' },
  { id: 'sub-cs', name: 'علوم الحاسب', icon: null, description: 'برمجة وحساب آلي' },
  { id: 'sub-history', name: 'التاريخ', icon: null, description: 'تاريخ مصر والعالم' },
  { id: 'sub-geo', name: 'الجغرافيا', icon: null, description: 'جغرافيا طبيعية وبشرية' },
  { id: 'sub-stats', name: 'الإحصاء', icon: null, description: 'احتمال وإحصاء' },
  { id: 'sub-phil', name: 'الفلسفة والمنطق', icon: null, description: 'فلسفة ومنطق وتفكير نقدي' },
];

export const GRADES: Grade[] = [
  { id: 'g1p', name: 'Grade 1 Primary', level: 1 },
  { id: 'g2p', name: 'Grade 2 Primary', level: 2 },
  { id: 'g3p', name: 'Grade 3 Primary', level: 3 },
  { id: 'g4p', name: 'Grade 4 Primary', level: 4 },
  { id: 'g5p', name: 'Grade 5 Primary', level: 5 },
  { id: 'g6p', name: 'Grade 6 Primary', level: 6 },
  { id: 'g1pr', name: 'Grade 1 Preparatory', level: 7 },
  { id: 'g2pr', name: 'Grade 2 Preparatory', level: 8 },
  { id: 'g3pr', name: 'Grade 3 Preparatory', level: 9 },
  { id: 'g1s', name: 'Grade 1 Secondary', level: 10 },
  { id: 'g2s', name: 'Grade 2 Secondary', level: 11 },
  { id: 'g3s', name: 'Grade 3 Secondary', level: 12 },
];

export const LOCATIONS: Location[] = [
  { id: 'loc-zamalek', name: 'الزمالك', address: 'ش جمال الدين أبو المحاسن' },
  { id: 'loc-nasr', name: 'مدينة نصر', address: 'شارع عباس العقاد' },
  { id: 'loc-maadi', name: 'المعادي', address: 'شارع 9' },
  { id: 'loc-dokki', name: 'الدقي', address: 'شارع التحرير' },
  { id: 'loc-mohande', name: 'المهندسين', address: 'ش جامعة الدول العربية' },
  { id: 'loc-newcairo', name: 'التجمع الخامس', address: 'الحي الأول' },
  { id: 'loc-october', name: 'السادس من أكتوبر', address: 'الحي السابع' },
  { id: 'loc-helwan', name: 'حلوان', address: 'شارع 23 يوليو' },
];

const sub = (id: string): Subject => SUBJECTS.find((s) => s.id === id)!;
const gr = (id: string): Grade => GRADES.find((g) => g.id === id)!;
const loc = (id: string): Location => LOCATIONS.find((l) => l.id === id)!;

/* ------------------------------------------------------------------ */
/*  Teachers pool (24) — rich, realistic Arabic Egyptian content.      */
/*  `_centerId` is internal demo metadata (not part of PublicTeacher). */
/* ------------------------------------------------------------------ */

interface TeacherRecord {
  id: string;
  fullName: string;
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  locationId: string;
  subjectIds: string[];
  gradeIds: string[];
  daySlots: { day: number; startTime: string; endTime: string }[];
  rating: number;
  ratingCount: number;
  _centerId: string;
}

const TEACHER_RECORDS: TeacherRecord[] = [
  { id: 't-01', fullName: 'د. أحمد عبد الرحمن', bio: 'مدرس رياضيات حاصل على الدكتوراه، خبير في تبسيط التفاضل والتكامل لطلاب الثانوية العامة، أسلوبه ممتع ونتائجه ملموسة.', yearsExperience: 12, hourlyRate: 250, locationId: 'loc-zamalek', subjectIds: ['sub-math'], gradeIds: ['g3s', 'g2s', 'g1s'], daySlots: [{ day: 0, startTime: '16:00', endTime: '17:30' }, { day: 2, startTime: '18:00', endTime: '19:30' }, { day: 4, startTime: '17:00', endTime: '18:30' }], rating: 4.9, ratingCount: 187, _centerId: 'c-nile' },
  { id: 't-02', fullName: 'أستاذة منى السيد', bio: 'معلمة فيزياء متميزة، شرح عملي بأمثلة من الحياة اليومية، متخصصة في إعداد طلاب الصف الثالث الثانوي.', yearsExperience: 9, hourlyRate: 220, locationId: 'loc-nasr', subjectIds: ['sub-physics'], gradeIds: ['g3s', 'g2s'], daySlots: [{ day: 1, startTime: '15:00', endTime: '16:30' }, { day: 3, startTime: '16:00', endTime: '17:30' }, { day: 5, startTime: '10:00', endTime: '11:30' }], rating: 4.8, ratingCount: 142, _centerId: 'c-future' },
  { id: 't-03', fullName: 'أ. محمد فتحي', bio: 'مدرس أحياء خبير، أسئلة تدريبية شاملة ومراجعات نهائية، يتابع مستوي الطالب أولًا بأول.', yearsExperience: 10, hourlyRate: 200, locationId: 'loc-maadi', subjectIds: ['sub-bio'], gradeIds: ['g3s', 'g2s'], daySlots: [{ day: 0, startTime: '14:00', endTime: '15:30' }, { day: 2, startTime: '16:00', endTime: '17:30' }], rating: 4.7, ratingCount: 98, _centerId: 'c-excellence' },
  { id: 't-04', fullName: 'أ. سارة عادل', bio: 'معلمة لغة إنجليزية حاصلة على IELTS، طرق حديثة للمحادثة والقواعد وتدريب على امتحانات أبناؤنا في الخارج.', yearsExperience: 7, hourlyRate: 180, locationId: 'loc-dokki', subjectIds: ['sub-english', 'sub-french'], gradeIds: ['g6p', 'g1pr', 'g2pr'], daySlots: [{ day: 6, startTime: '10:00', endTime: '11:30' }, { day: 1, startTime: '16:00', endTime: '17:30' }, { day: 1, startTime: '18:00', endTime: '19:30' }], rating: 4.6, ratingCount: 76, _centerId: 'c-future' },
  { id: 't-05', fullName: 'د. حسام الدين إبراهيم', bio: 'مدرس كيمياء بجامعة القاهرة، شرح تجريبي ممتع للمعادلات والتفاعلات، حصص تفاعلية مشوقة.', yearsExperience: 11, hourlyRate: 230, locationId: 'loc-mohande', subjectIds: ['sub-chem'], gradeIds: ['g3s', 'g2s', 'g1s'], daySlots: [{ day: 0, startTime: '17:00', endTime: '18:30' }, { day: 3, startTime: '18:00', endTime: '19:30' }], rating: 4.8, ratingCount: 164, _centerId: 'c-nile' },
  { id: 't-06', fullName: 'أستاذة نورا مصطفى', bio: 'معلمة رياضيات للمرحلة الإعدادية، صبور وبتشرح بخطوات واضحة، أعرف أسماء طلابي بالكامل.', yearsExperience: 6, hourlyRate: 150, locationId: 'loc-october', subjectIds: ['sub-math'], gradeIds: ['g1pr', 'g2pr', 'g3pr'], daySlots: [{ day: 2, startTime: '13:00', endTime: '14:30' }, { day: 4, startTime: '15:00', endTime: '16:30' }, { day: 6, startTime: '12:00', endTime: '13:30' }], rating: 4.5, ratingCount: 54, _centerId: 'c-bright' },
  { id: 't-07', fullName: 'أ. كريم عاصم', bio: 'مدرس لغة عربية ونحو، طريقة مبتكرة تجعل النحو سهلًا ممتعًا، متخصص في الصف الثالث الثانوي.', yearsExperience: 8, hourlyRate: 190, locationId: 'loc-nasr', subjectIds: ['sub-arabic'], gradeIds: ['g3s', 'g2s', 'g1s'], daySlots: [{ day: 0, startTime: '15:30', endTime: '17:00' }, { day: 2, startTime: '17:30', endTime: '19:00' }], rating: 4.7, ratingCount: 121, _centerId: 'c-smart' },
  { id: 't-08', fullName: 'أستاذة رانيا محمد', bio: 'معلمة إنجليزي مبدعة لطلاب المرحلة الابتدائية، ألعاب وأنشطة تنمي مهارات الاستماع والتحدث.', yearsExperience: 5, hourlyRate: 130, locationId: 'loc-newcairo', subjectIds: ['sub-english'], gradeIds: ['g1p', 'g2p', 'g3p', 'g4p'], daySlots: [{ day: 6, startTime: '09:00', endTime: '10:30' }, { day: 1, startTime: '12:00', endTime: '13:30' }, { day: 3, startTime: '15:00', endTime: '16:30' }], rating: 4.4, ratingCount: 41, _centerId: 'c-bright' },
  { id: 't-09', fullName: 'د. ياسر الشناوي', bio: 'مدرس فيزياء ورياضيات للمرحلة الثانوية، خبرة 15 عامًا في تدريب طلاب الثانوية العامة.', yearsExperience: 15, hourlyRate: 260, locationId: 'loc-zamalek', subjectIds: ['sub-physics', 'sub-math'], gradeIds: ['g2s', 'g3s'], daySlots: [{ day: 4, startTime: '11:00', endTime: '12:30' }, { day: 1, startTime: '17:00', endTime: '18:30' }], rating: 4.9, ratingCount: 210, _centerId: 'c-nile' },
  { id: 't-10', fullName: 'أستاذة هالة عبد الناصر', bio: 'معلمة كيمياء وأحياء بشغف كبير، بقشر العلوم بطريقة سهلة وبأسئلة تدريبية على النظام الجديد.', yearsExperience: 9, hourlyRate: 210, locationId: 'loc-maadi', subjectIds: ['sub-chem', 'sub-bio'], gradeIds: ['g2s', 'g3s'], daySlots: [{ day: 6, startTime: '16:00', endTime: '17:30' }, { day: 3, startTime: '14:00', endTime: '15:30' }, { day: 4, startTime: '17:30', endTime: '19:00' }], rating: 4.6, ratingCount: 89, _centerId: 'c-future' },
  { id: 't-11', fullName: 'أ. عمرو خالد', bio: 'مدرس علوم حاسب وبرمجة للأطفال والكبار، بايثون وسكراتش ومسابقات البرمجة.', yearsExperience: 6, hourlyRate: 160, locationId: 'loc-newcairo', subjectIds: ['sub-cs'], gradeIds: ['g6p', 'g1pr', 'g2s', 'g3s'], daySlots: [{ day: 4, startTime: '12:00', endTime: '13:30' }, { day: 4, startTime: '15:00', endTime: '16:30' }], rating: 4.5, ratingCount: 33, _centerId: 'c-smart' },
  { id: 't-12', fullName: 'د. ليلى حسن', bio: 'مدرسة تاريخ وجغرافيا، سرد قصصي متميز يوصل المعلومة ويحبب الطالب في المادة.', yearsExperience: 10, hourlyRate: 170, locationId: 'loc-helwan', subjectIds: ['sub-history', 'sub-geo'], gradeIds: ['g1s', 'g2s'], daySlots: [{ day: 1, startTime: '10:00', endTime: '11:30' }, { day: 2, startTime: '13:00', endTime: '14:30' }, { day: 4, startTime: '09:00', endTime: '10:30' }], rating: 4.4, ratingCount: 47, _centerId: 'c-excellence' },
  { id: 't-13', fullName: 'أ. طارق سامح', bio: 'مدرس رياضيات للمرحلة الابتدائية، أنشطة شيقة تنمّي الذكاء الرياضي من الصغر.', yearsExperience: 7, hourlyRate: 120, locationId: 'loc-mohande', subjectIds: ['sub-math'], gradeIds: ['g1p', 'g2p', 'g3p', 'g4p', 'g5p'], daySlots: [{ day: 0, startTime: '10:00', endTime: '11:00' }, { day: 2, startTime: '12:00', endTime: '13:00' }, { day: 4, startTime: '16:00', endTime: '17:00' }], rating: 4.3, ratingCount: 28, _centerId: 'c-bright' },
  { id: 't-14', fullName: 'أستاذة إيمان رشدي', bio: 'معلمة لغة عربية للمرحلة الابتدائية والإعدادية، متخصصة في قواعد النحو والتعبير.', yearsExperience: 8, hourlyRate: 140, locationId: 'loc-dokki', subjectIds: ['sub-arabic'], gradeIds: ['g4p', 'g5p', 'g6p', 'g1pr'], daySlots: [{ day: 6, startTime: '11:00', endTime: '12:30' }, { day: 3, startTime: '15:30', endTime: '17:00' }], rating: 4.5, ratingCount: 39, _centerId: 'c-excellence' },
  { id: 't-15', fullName: 'أ. مصطفى النجار', bio: 'مدرس إحصاء واحتمال للمرحلة الثانوية، شرح عملي بالأمثلة المحلولة، متابع دقيق لواجبات الطلاب.', yearsExperience: 5, hourlyRate: 175, locationId: 'loc-october', subjectIds: ['sub-stats', 'sub-math'], gradeIds: ['g1s', 'g2s', 'g3s'], daySlots: [{ day: 0, startTime: '12:00', endTime: '13:30' }, { day: 3, startTime: '17:00', endTime: '18:30' }], rating: 4.4, ratingCount: 51, _centerId: 'c-smart' },
  { id: 't-16', fullName: 'د. شيماء عبد الله', bio: 'مدرسة فيزياء خبرة 10 سنوات، حصص مراجعة شاملة وملخصات جاهزة تلخص المنهج.', yearsExperience: 10, hourlyRate: 215, locationId: 'loc-nasr', subjectIds: ['sub-physics'], gradeIds: ['g2s', 'g3s'], daySlots: [{ day: 6, startTime: '14:00', endTime: '15:30' }, { day: 1, startTime: '18:30', endTime: '20:00' }], rating: 4.7, ratingCount: 103, _centerId: 'c-future' },
  { id: 't-17', fullName: 'أ. إيهاب فوزي', bio: 'مدرس جغرافيا وتاريخ، خرائط ذهنية تسهل الحفظ، وأسلوب قصصي لا يُنسى.', yearsExperience: 9, hourlyRate: 155, locationId: 'loc-zamalek', subjectIds: ['sub-geo'], gradeIds: ['g2pr', 'g3pr', 'g1s'], daySlots: [{ day: 2, startTime: '10:30', endTime: '12:00' }, { day: 5, startTime: '14:00', endTime: '15:30' }], rating: 4.3, ratingCount: 36, _centerId: 'c-nile' },
  { id: 't-18', fullName: 'أستاذة نجوى سليم', bio: 'معلمة فرنسية محترفة لتأسيس الأطفال والمرحلة الإعدادية، تعليم باللعب والأغاني.', yearsExperience: 6, hourlyRate: 145, locationId: 'loc-helwan', subjectIds: ['sub-french'], gradeIds: ['g4p', 'g5p', 'g6p', 'g1pr'], daySlots: [{ day: 6, startTime: '12:30', endTime: '14:00' }, { day: 1, startTime: '11:00', endTime: '12:30' }], rating: 4.5, ratingCount: 44, _centerId: 'c-excellence' },
  { id: 't-19', fullName: 'أ. عبد الله صبري', bio: 'مدرس رياضيات للمرحلة الإعدادية وبداية الثانوية، تركيز على بناء الأساس وتحبيب المادة.', yearsExperience: 7, hourlyRate: 165, locationId: 'loc-dokki', subjectIds: ['sub-math'], gradeIds: ['g2pr', 'g3pr', 'g1s'], daySlots: [{ day: 0, startTime: '11:30', endTime: '13:00' }, { day: 4, startTime: '13:00', endTime: '14:30' }], rating: 4.4, ratingCount: 58, _centerId: 'c-excellence' },
  { id: 't-20', fullName: 'د. مريم جمال', bio: 'مدرسة أحياء وكيمياء لطلاب الثانوية، ملخصات ومراجعات نهائية تحقق الدرجات النهائية.', yearsExperience: 8, hourlyRate: 205, locationId: 'loc-newcairo', subjectIds: ['sub-bio', 'sub-chem'], gradeIds: ['g1s', 'g2s', 'g3s'], daySlots: [{ day: 0, startTime: '19:00', endTime: '20:30' }, { day: 3, startTime: '16:30', endTime: '18:00' }], rating: 4.6, ratingCount: 82, _centerId: 'c-smart' },
  { id: 't-21', fullName: 'أ. هاني العشماوي', bio: 'مدرس لغة إنجليزية للمرحلة الثانوية، مهارات اللغة الأربعة بشكل متوازن وتدريبات امتحانية.', yearsExperience: 11, hourlyRate: 185, locationId: 'loc-mohande', subjectIds: ['sub-english'], gradeIds: ['g2s', 'g3s'], daySlots: [{ day: 1, startTime: '14:00', endTime: '15:30' }, { day: 3, startTime: '18:00', endTime: '19:30' }], rating: 4.6, ratingCount: 95, _centerId: 'c-bright' },
  { id: 't-22', fullName: 'أستاذة دعاء رمضان', bio: 'معلمة رياضيات وعلوم حاسب، اهتمام خاص بالطلاب بطيئي التعلم ومتابعة ولي الأمر دوريًا.', yearsExperience: 5, hourlyRate: 150, locationId: 'loc-october', subjectIds: ['sub-math', 'sub-cs'], gradeIds: ['g1p', 'g2p', 'g3p', 'g6p'], daySlots: [{ day: 6, startTime: '15:00', endTime: '16:30' }, { day: 2, startTime: '11:00', endTime: '12:30' }], rating: 4.4, ratingCount: 37, _centerId: 'c-bright' },
  { id: 't-23', fullName: 'د. سامح يوسف', bio: 'مدرس كيمياء خبير للمرحلة الثانوية، أسلوب مشوق في شرح المسائل والتفاعلات العضوية.', yearsExperience: 13, hourlyRate: 240, locationId: 'loc-zamalek', subjectIds: ['sub-chem'], gradeIds: ['g2s', 'g3s'], daySlots: [{ day: 0, startTime: '13:30', endTime: '15:00' }, { day: 2, startTime: '19:00', endTime: '20:30' }], rating: 4.8, ratingCount: 178, _centerId: 'c-nile' },
  { id: 't-24', fullName: 'أستاذة رضوى الشاذلي', bio: 'معلمة عربية وإنجليزية لتأسيس الأطفال من سن 6 سنوات، صبورة ومرحة وطريقتها مثمرة.', yearsExperience: 4, hourlyRate: 110, locationId: 'loc-maadi', subjectIds: ['sub-arabic', 'sub-english'], gradeIds: ['g1p', 'g2p', 'g3p'], daySlots: [{ day: 6, startTime: '10:30', endTime: '12:00' }, { day: 1, startTime: '09:00', endTime: '10:30' }, { day: 4, startTime: '10:00', endTime: '11:30' }], rating: 4.3, ratingCount: 25, _centerId: 'c-future' },
];

const SLOT_SEQ = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function availabilityFor(record: TeacherRecord): AvailabilitySlot[] {
  return record.daySlots.map((slot, idx) => ({
    id: `${record.id}-av-${SLOT_SEQ[idx]}`,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    location: loc(record.locationId),
  }));
}

export const TEACHERS: (PublicTeacher & { _centerId: string })[] = TEACHER_RECORDS.map((r) => ({
  id: r.id,
  fullName: r.fullName,
  bio: r.bio,
  yearsExperience: r.yearsExperience,
  hourlyRate: r.hourlyRate,
  photo: null,
  createdAt: '2023-09-01T10:00:00.000Z',
  location: loc(r.locationId),
  subjects: r.subjectIds.map(sub),
  grades: r.gradeIds.map(gr),
  availability: availabilityFor(r),
  rating: r.rating,
  ratingCount: r.ratingCount,
  _centerId: r._centerId,
}));

export function teacherById(id: string): (PublicTeacher & { _centerId: string }) | undefined {
  return TEACHERS.find((t) => t.id === id);
}

/* Reviews pool for teacher profiles — deterministic, per teacher. */
const REVIEWER_NAMES = ['عبدالله', 'سلمى', 'المحمدية عائلتي', 'مصطفى كامل', 'أميرة صلاح', 'يوسف وليد', 'مريم الطحاوي', 'خالد رمضان'];
const REVIEW_COMMENTS = [
  'شرح ممتاز وبسيط، ابني اتحول من مادة صعبة لأصعب ما فيها حاجة.',
  'أسلوب رائع وكسملة، بيركز على النقاط اللي بتيجي في الامتحانات.',
  'أفضل مدرس جربته لحد الآن، متابعة مستمرة وتقارير دورية.',
  'صبر ومهنية عالية جدًا، وفي وقت قصير النتيجة ظهرت.',
  'مدرسة محترمة جدًا وشرحها من الآخر، أنصح بيها.',
  'بيفهم الطالب من أول مرة، طريقة الشرح مش بتتنسي.',
  'التزام تام بالمواعيد وتقييم مستمر للمستوي.',
  'حلو جدًا للأطفال، بيحببهم في المادة، بناتي بستنوا الحصة.',
  'نصيحة لكل ولي أمر: مدرس شاطر ومخلص ويستاهل الثقة.',
  'شرح وافر ومنظم، وتدريبات كافية قبل الامتحانات.',
];
const REVIEWER_TYPES: ('student' | 'parent')[] = ['parent', 'student', 'parent', 'student', 'parent'];

export function reviewsFor(teacher: PublicTeacher, count = 3): { reviews: Review[]; total: number } {
  const offset = parseInt(teacher.id.slice(-2), 10) % REVIEWER_NAMES.length;
  const reviews: Review[] = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: `${teacher.id}-rev-${i}`,
      stars: Math.max(3, Math.min(5, Math.round(teacher.rating + ((i % 3) - 1) * 0.5))),
      comment: REVIEW_COMMENTS[(offset + i) % REVIEW_COMMENTS.length],
      createdAt: `2025-${String(3 + (i % 8)).padStart(2, '0')}-${String((offset + i) % 27 + 1).padStart(2, '0')}T12:00:00.000Z`,
      author: {
        type: REVIEWER_TYPES[(offset + i) % REVIEWER_TYPES.length],
        fullName: REVIEWER_NAMES[(offset + i) % REVIEWER_NAMES.length],
        photo: null,
      },
    });
  }
  return { reviews, total: teacher.ratingCount };
}

/* ------------------------------------------------------------------ */
/*  Centers pool (20) — public profiles with real Egyptian places.     */
/* ------------------------------------------------------------------ */

type CenterRecord = {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  city: string;
  address: string;
  description: string;
  lat?: number;
  lng?: number;
  subjectIds: string[];
  gradeIds: string[];
  ratingAverage: number;
  ratingCount: number;
  phone: string;
  email?: string;
};

const CENTER_RECORDS: CenterRecord[] = [
  { id: 'c-nile', name: 'مركز النيل للتعليم', nameEn: 'Nile Education Center', slug: 'nile-education-center', city: 'الجيزة', address: 'شارع سعيد ثابت، العجوزة', description: 'مركز تعليمي متكامل يضم نخبة من المدرسين، وبرامج مراجعة مكثفة لطلاب الثانوية العامة.', lat: 30.0529, lng: 31.2112, subjectIds: ['sub-math', 'sub-physics', 'sub-chem', 'sub-arabic'], gradeIds: ['g1s', 'g2s', 'g3s'], ratingAverage: 4.8, ratingCount: 210, phone: '+20 100 101 0203', email: 'info@nile-education.eg' },
  { id: 'c-future', name: 'أكاديمية المستقبل للعلوم', nameEn: 'Future Academy', slug: 'future-academy', city: 'القاهرة', address: 'شارع عباس العقاد، مدينة نصر', description: 'أكاديمية متخصصة في الرياضيات والعلوم واللغات بنظام مجموعات مصغرة ومتابعة فردية.', lat: 30.0588, lng: 31.3236, subjectIds: ['sub-math', 'sub-physics', 'sub-bio', 'sub-chem', 'sub-english'], gradeIds: ['g2s', 'g3s'], ratingAverage: 4.7, ratingCount: 175, phone: '+20 111 222 3344', email: 'hello@future-academy.eg' },
  { id: 'c-excellence', name: 'مركز التفوق التعليمي', nameEn: 'Excellence Learning Center', slug: 'excellence-learning-center', city: 'الجيزة', address: 'شارع التحرير، الدقي', description: 'مركز التعليم بجدول حصص منظم واختبارات شهرية تقيس تقدم الطالب بانتظام.', lat: 30.0409, lng: 31.2096, subjectIds: ['sub-bio', 'sub-history', 'sub-arabic', 'sub-math'], gradeIds: ['g4p', 'g5p', 'g6p', 'g1pr', 'g2pr', 'g3pr'], ratingAverage: 4.5, ratingCount: 132, phone: '+20 122 333 4455', email: 'excellence@demo.eg' },
  { id: 'c-bright', name: 'مركز المستقبل المشرق', nameEn: 'Bright Future Center', slug: 'bright-future-center', city: 'الجيزة', address: 'الحي السابع، السادس من أكتوبر', description: 'مركز متخصص في تأسيس الطلاب في المراحل المبكرة بأسلوب يجمع بين التعليم والترفيه.', lat: 29.9344, lng: 30.9216, subjectIds: ['sub-math', 'sub-arabic', 'sub-english'], gradeIds: ['g1p', 'g2p', 'g3p', 'g4p'], ratingAverage: 4.4, ratingCount: 88, phone: '+20 133 444 5566', email: 'bright@demo.eg' },
  { id: 'c-smart', name: 'أكاديمية العقول الذكية', nameEn: 'Smart Minds Academy', slug: 'smart-minds-academy', city: 'القاهرة', address: 'شارع 9، المعادي', description: 'أكاديمية حديثة تهتم بالتفكير الناقد والبرمجة والرياضيات الذهنية لجميع المراحل.', lat: 29.9507, lng: 31.2485, subjectIds: ['sub-cs', 'sub-math', 'sub-stats', 'sub-bio'], gradeIds: ['g6p', 'g1pr', 'g2s', 'g3s'], ratingAverage: 4.6, ratingCount: 150, phone: '+20 144 555 6677', email: 'smart@demo.eg' },
  { id: 'c-radius', name: 'مركز التميز للتعليم', nameEn: 'Excellence Education Hub', slug: 'excellence-education-hub', city: 'القاهرة', address: 'شارع جامعة الدول العربية، المهندسين', description: 'مركز متكامل يقدم بأنظمة تعليم حديثة وتقارير تقدم شهرية لولي الأمر.', lat: 30.0488, lng: 31.1997, subjectIds: ['sub-english', 'sub-french', 'sub-geo'], gradeIds: ['g1pr', 'g2pr', 'g3pr', 'g1s'], ratingAverage: 4.3, ratingCount: 97, phone: '+20 155 666 7788', email: 'excellence-hub@demo.eg' },
  { id: 'c-nasr', name: 'أكاديمية النصر الحديثة', nameEn: 'Nasr Modern Academy', slug: 'nasr-modern-academy', city: 'القاهرة', address: 'شارع الميرغني، مصر الجديدة', description: 'أكاديمية تعليمية بقاعات مجهزة وشبكة مدرسين معتمدين ومراجعات نهائية.', lat: 30.0878, lng: 31.3306, subjectIds: ['sub-math', 'sub-physics', 'sub-chem'], gradeIds: ['g1s', 'g2s', 'g3s'], ratingAverage: 4.7, ratingCount: 143, phone: '+20 166 777 8899', email: 'nasr@demo.eg' },
  { id: 'c-roada', name: 'مركز رواد العلم', nameEn: 'Science Pioneers Center', slug: 'science-pioneers-center', city: 'القاهرة', address: 'شارع 26 يوليو، الزمالك', description: 'مركز مرموق للعلوم والرياضيات بحصص فردية ومجموعات صغيرة.', lat: 30.0627, lng: 31.2191, subjectIds: ['sub-math', 'sub-physics'], gradeIds: ['g2s', 'g3s'], ratingAverage: 4.8, ratingCount: 165, phone: '+20 177 888 9900', email: 'rowad@demo.eg' },
  { id: 'c-five', name: 'أكاديمية الإبداع للعلوم', nameEn: 'Creativity Science Academy', slug: 'creativity-science-academy', city: 'القاهرة', address: 'الحي الأول، التجمع الخامس', description: 'أكاديمية عصرية بتقنيات شرح تفاعلية وفصول مجهزة بأحدث الأجهزة.', lat: 30.0089, lng: 31.4944, subjectIds: ['sub-bio', 'sub-chem', 'sub-cs'], gradeIds: ['g1pr', 'g2pr', 'g1s'], ratingAverage: 4.5, ratingCount: 74, phone: '+20 188 999 0011', email: 'creativity@demo.eg' },
  { id: 'c-work', name: 'مركز العلم والعمل', nameEn: 'Science & Work Center', slug: 'science-work-center', city: 'القاهرة', address: 'شارع شبرا، شبرا', description: 'مركز شعبي عريق بأسعار مناسبة وجودة تعليمية عالية لطلاب المنطقة.', lat: 30.0803, lng: 31.2545, subjectIds: ['sub-arabic', 'sub-math', 'sub-english'], gradeIds: ['g1p', 'g2p', 'g3p', 'g4p'], ratingAverage: 4.2, ratingCount: 61, phone: '+20 199 111 2233', email: 'science-work@demo.eg' },
  { id: 'c-nour', name: 'أكاديمية النور التعليمية', nameEn: 'Nour Educational Academy', slug: 'nour-educational-academy', city: 'القاهرة', address: 'شارع 23 يوليو، حلوان', description: 'أكاديمية لتأسيس وإتقان اللغات والعلوم للمراحل الابتدائية والإعدادية.', lat: 29.8431, lng: 31.3312, subjectIds: ['sub-english', 'sub-french', 'sub-math'], gradeIds: ['g1p', 'g2p', 'g3p', 'g4p', 'g5p', 'g6p'], ratingAverage: 4.3, ratingCount: 52, phone: '+20 100 222 3344', email: 'nour@demo.eg' },
  { id: 'c-next', name: 'مركز الجيل الجديد', nameEn: 'New Generation Center', slug: 'new-generation-center', city: 'القاهرة', address: 'شارع أحمد عرابي، عين شمس', description: 'مركز متخصص في الرياضيات الذهنية والبرمجة للأطفال والمراهقين.', lat: 30.1202, lng: 31.3342, subjectIds: ['sub-math', 'sub-cs', 'sub-stats'], gradeIds: ['g3p', 'g4p', 'g5p', 'g6p'], ratingAverage: 4.4, ratingCount: 45, phone: '+20 111 333 4455', email: 'next-gen@demo.eg' },
  { id: 'c-farouq', name: 'أكاديمية الفاروق', nameEn: 'Al-Farouq Academy', slug: 'al-farouq-academy', city: 'الجيزة', address: 'شارع الهرم، هرم', description: 'أكاديمية متميزة بكوادر تدريسية محترمة وبرامج مراجعة لجميع المراحل.', lat: 29.9939, lng: 31.1718, subjectIds: ['sub-math', 'sub-physics', 'sub-arabic'], gradeIds: ['g1pr', 'g2pr', 'g3pr', 'g1s'], ratingAverage: 4.1, ratingCount: 38, phone: '+20 122 444 5566', email: 'farouq@demo.eg' },
  { id: 'c-know', name: 'مركز المعرفة الأهلية', nameEn: 'Knowledge Community Center', slug: 'knowledge-community-center', city: 'القاهرة', address: 'شارع طلعت حرب، وسط البلد', description: 'مركز لتعليم اللغات والعلوم الإنسانية بمناهج حديثة وقاعات مكيفة.', lat: 30.0537, lng: 31.2406, subjectIds: ['sub-history', 'sub-geo', 'sub-phil', 'sub-arabic'], gradeIds: ['g1s', 'g2s'], ratingAverage: 4.2, ratingCount: 29, phone: '+20 133 555 6677', email: 'know@demo.eg' },
  { id: 'c-alex', name: 'مركز الإسكندرية للتدريس', nameEn: 'Alexandria Teaching Center', slug: 'alexandria-teaching-center', city: 'الإسكندرية', address: 'شارع فؤاد، وسط الإسكندرية', description: 'أعرق مراكز التعليم في الإسكندرية بسمعة طيبة ونتائج متميزة.', lat: 31.1977, lng: 29.9043, subjectIds: ['sub-math', 'sub-physics', 'sub-english'], gradeIds: ['g1s', 'g2s', 'g3s'], ratingAverage: 4.6, ratingCount: 118, phone: '+20 144 666 7788', email: 'alex@demo.eg' },
  { id: 'c-mansoura', name: 'أكاديمية المنصورة الأهلية', nameEn: 'Mansoura Community Academy', slug: 'mansoura-community-academy', city: 'المنصورة', address: 'شارع الجيش, المنصورة', description: 'أكاديمية أهلية تقدم برامج تقوية ومراجعات نهائية لكل المراحل.', lat: 31.0409, lng: 31.3787, subjectIds: ['sub-math', 'sub-bio', 'sub-arabic'], gradeIds: ['g2pr', 'g3pr', 'g1s', 'g2s'], ratingAverage: 4.5, ratingCount: 84, phone: '+20 155 777 8899', email: 'mansoura@demo.eg' },
  { id: 'c-tanta', name: 'مركز طنطا التعليمي', nameEn: 'Tanta Educational Hub', slug: 'tanta-educational-hub', city: 'طنطا', address: 'شارع سعيد، طنطا', description: 'مركز تدريس للرياضيات والعلوم بأسعار اقتصادية ومتابعة جادة.', lat: 30.7885, lng: 31.0019, subjectIds: ['sub-math', 'sub-physics', 'sub-chem'], gradeIds: ['g3pr', 'g1s', 'g2s', 'g3s'], ratingAverage: 4.3, ratingCount: 56, phone: '+20 166 888 9900', email: 'tanta@demo.eg' },
  { id: 'c-assiut', name: 'أكاديمية أسيوط الحديثة', nameEn: 'Assiut Modern Academy', slug: 'assiut-modern-academy', city: 'أسيوط', address: 'ميدان المحطة, أسيوط', description: 'أكاديمية حديثة لطلاب الصعيد بمعايير تعليم القاهرة نفسها.', lat: 27.182, lng: 31.1858, subjectIds: ['sub-math', 'sub-english', 'sub-history'], gradeIds: ['g2s', 'g3s'], ratingAverage: 4.2, ratingCount: 34, phone: '+20 177 999 0011', email: 'assiut@demo.eg' },
  { id: 'c-giza', name: 'مركز الجيزة المتميز', nameEn: 'Giza Premium Center', slug: 'giza-premium-center', city: 'الجيزة', address: 'شارع الهرم، الجيزة', description: 'مركز مقام حديثًا بأحدث أساليب التعليم وقاعات مجهزة بالكامل.', lat: 30.0131, lng: 31.2089, subjectIds: ['sub-english', 'sub-french', 'sub-geo'], gradeIds: ['g4p', 'g5p', 'g6p', 'g1pr'], ratingAverage: 4.1, ratingCount: 22, phone: '+20 188 111 2233', email: 'giza@demo.eg' },
  { id: 'c-herth', name: 'مركز النيل الإقليمي', nameEn: 'Nile Regional Center', slug: 'nile-regional-center', city: 'القاهرة', address: 'شارع العروبة، مصر الجديدة', description: 'مركز تعليمي متعدد الفروع يقدم برامج تعليمية متكاملة بكادر دولي.', lat: 30.0908, lng: 31.3325, subjectIds: ['sub-math', 'sub-physics', 'sub-chem', 'sub-bio'], gradeIds: ['g1s', 'g2s', 'g3s'], ratingAverage: 4.7, ratingCount: 160, phone: '+20 199 222 3344', email: 'region@demo.eg' },
];

export const CENTERS: PublicCenter[] = CENTER_RECORDS.map((c) => ({
  id: c.id,
  name: c.name,
  nameEn: c.nameEn ?? null,
  slug: c.slug,
  city: c.city,
  address: c.address,
  latitude: c.lat ?? null,
  longitude: c.lng ?? null,
  description: c.description,
  photoUrl: null,
  teacherCount: TEACHERS.filter((t) => t._centerId === c.id).length,
  studentCount: 30 + TEACHERS.filter((t) => t._centerId === c.id).length * 12,
  subjects: c.subjectIds.map(sub),
  grades: c.gradeIds.map(gr),
  centerEmail: c.email ?? null,
  centerPhone: c.phone,
  ratingAverage: c.ratingAverage,
  ratingCount: c.ratingCount,
}));

export function centerById(id: string): PublicCenter | undefined {
  return CENTERS.find((c) => c.id === id);
}

export function centerTeachersFor(centerId: string): PublicCenterTeacher[] {
  return TEACHERS.filter((t) => t._centerId === centerId).map((t) => ({
    id: t.id,
    userId: `u-${t.id}`,
    fullName: t.fullName,
    photo: t.photo,
    bio: t.bio,
    subjects: t.subjects.map((s) => ({ id: s.id, name: s.name })),
    grades: t.grades.map((g) => ({ id: g.id, name: g.name })),
    yearsExperience: t.yearsExperience,
    hourlyRate: t.hourlyRate,
    rating: t.rating,
    ratingCount: t.ratingCount,
  }));
}

/* ------------------------------------------------------------------ */
/*  Co-spaces (12)                                                     */
/* ------------------------------------------------------------------ */

export const SPACES: PublicSpace[] = [
  { id: 'sp-01', name: 'مساحة زمزم للتركيز', nameEn: 'Zamzam Focus Space', governorate: 'القاهرة', area: 'المعادي', latitude: 29.9525, longitude: 31.2477, photoUrl: null, spaceType: 'مساحة تركيز فردي', capacity: 8, prices: [60, 100], features: ['واي فاي سريع', 'أجهزة كمبيوتر', 'تكييف'], ratingAverage: 4.6, ratingCount: 34, centerId: 'c-smart' },
  { id: 'sp-02', name: 'بُستان المذاكرة', nameEn: 'Study Garden', governorate: 'الجيزة', area: 'الدقي', latitude: 30.0426, longitude: 31.2088, photoUrl: null, spaceType: 'مساحة مذاكرة جماعية', capacity: 12, prices: [50, 80], features: ['واي فاي', 'لوحات بيضاء', 'قهوة مجانية'], ratingAverage: 4.4, ratingCount: 21, centerId: 'c-excellence' },
  { id: 'sp-03', name: 'ركن المتفوقين', nameEn: 'Top Students Corner', governorate: 'القاهرة', area: 'مدينة نصر', latitude: 30.0588, longitude: 31.3236, photoUrl: null, spaceType: 'مساحة تركيز فردي', capacity: 10, prices: [70, 110], features: ['واي فاي سريع', 'طابعة', 'غرف هادئة'], ratingAverage: 4.7, ratingCount: 41, centerId: 'c-future' },
  { id: 'sp-04', name: 'قاعة النجاح', nameEn: 'Success Hall', governorate: 'القاهرة', area: 'مصر الجديدة', latitude: 30.0878, longitude: 31.3306, photoUrl: null, spaceType: 'قاعة مجموعة دراسة', capacity: 20, prices: [40, 70], features: ['شاشة عرض', 'سبورة تفاعلية', 'مكيفات'], ratingAverage: 4.3, ratingCount: 17, centerId: 'c-nasr' },
  { id: 'sp-05', name: 'مساحة الشروق', nameEn: 'Shorouk Space', governorate: 'القاهرة', area: 'التجمع الخامس', latitude: 30.0089, longitude: 31.4944, photoUrl: null, spaceType: 'مساحة تركيز فردي', capacity: 6, prices: [80, 130], features: ['واي فاي سريع', 'قهوة مختصة', 'ازدحام منخفض'], ratingAverage: 4.8, ratingCount: 28, centerId: 'c-five' },
  { id: 'sp-06', name: 'مكتبة النيل للمذاكرة', nameEn: 'Nile Study Library', governorate: 'القاهرة', area: 'الزمالك', latitude: 30.0627, longitude: 31.2191, photoUrl: null, spaceType: 'مكتبة هادئة', capacity: 15, prices: [55, 90], features: ['اشتراكات شهرية', 'إنترنت', 'مصادر مراجع'], ratingAverage: 4.5, ratingCount: 39, centerId: 'c-roada' },
  { id: 'sp-07', name: 'وست النهار للمذاكرة', nameEn: 'Midday Study Hub', governorate: 'الجيزة', area: 'السادس من أكتوبر', latitude: 29.9344, longitude: 30.9216, photoUrl: null, spaceType: 'مساحة مذاكرة جماعية', capacity: 18, prices: [45, 75], features: ['واي فاي', 'كافيتريا', 'مواقف سيارات'], ratingAverage: 4.2, ratingCount: 13, centerId: 'c-bright' },
  { id: 'sp-08', name: 'قاعة التفوق الدراسي', nameEn: 'Academic Excellence Hall', governorate: 'الإسكندرية', area: 'وسط الإسكندرية', latitude: 31.1977, longitude: 29.9043, photoUrl: null, spaceType: 'قاعة مجموعة دراسة', capacity: 25, prices: [35, 60], features: ['شاشة عرض', 'تكييف مركزي'], ratingAverage: 4.3, ratingCount: 26, centerId: 'c-alex' },
  { id: 'sp-09', name: 'مساحة الأوائل', nameEn: 'Top Achievers Space', governorate: 'القاهرة', area: 'عين شمس', latitude: 30.1202, longitude: 31.3342, photoUrl: null, spaceType: 'مساحة تركيز فردي', capacity: 9, prices: [50, 85], features: ['واي فاي', 'طابعة', 'شاي مجاني'], ratingAverage: 4.1, ratingCount: 11, centerId: 'c-next' },
  { id: 'sp-10', name: 'ركن الحفظ والمراجعة', nameEn: 'Memorization Corner', governorate: 'المنصورة', area: 'وسط المنصورة', latitude: 31.0409, longitude: 31.3787, photoUrl: null, spaceType: 'غرف حفظ هادئة', capacity: 14, prices: [40, 65], features: ['غرف عزل صوت', 'واي فاي', 'مرشد دراسي'], ratingAverage: 4.4, ratingCount: 19, centerId: 'c-mansoura' },
  { id: 'sp-11', name: 'قاعة أسيوط المجهزة', nameEn: 'Assiut Equipped Hall', governorate: 'أسيوط', area: 'وسط أسيوط', latitude: 27.182, longitude: 31.1858, photoUrl: null, spaceType: 'قاعة مجموعة دراسة', capacity: 30, prices: [30, 55], features: ['شاشة عرض', 'شبكة إنترنت', 'تكييف'], ratingAverage: 4.0, ratingCount: 9, centerId: 'c-assiut' },
  { id: 'sp-12', name: 'مساحة النخبة', nameEn: 'Elite Study Space', governorate: 'القاهرة', area: 'المهندسين', latitude: 30.0488, longitude: 31.1997, photoUrl: null, spaceType: 'مساحة تركيز فردي', capacity: 7, prices: [90, 140], features: ['واي فاي جيجابت', 'قهوة مختصة', 'أثاث مريح', 'غرف خاصة'], ratingAverage: 4.9, ratingCount: 31, centerId: 'c-radius' },
];

/* ------------------------------------------------------------------ */
/*  Center subscription packages (6)                                   */
/* ------------------------------------------------------------------ */

export const CENTER_PACKAGES: CenterPackage[] = [
  { id: 'pkg-start-m', name: 'باقة الانطلاقة', description: 'دخول المراكز الصغيرة والناشئة بميزانية بسيطة وأدوات أساسية.', billingPeriod: 'MONTHLY', priceMonthly: 300, currency: 'EGP', maxTeachers: 5, maxStudents: 100, maxEmployees: 2, maxAssistants: 2, maxRooms: 3, commissionRate: 0.05, includesChat: true, includesExams: false, includesAssignments: false, includesAttendance: true, includesPayments: true, includesAnalytics: false, includesMultiBranch: false },
  { id: 'pkg-start-q', name: 'باقة الانطلاقة', description: 'اشتراك ربع سنوي لأصحاب المراكز الناشئة.', billingPeriod: 'QUARTERLY', priceMonthly: 275, currency: 'EGP', maxTeachers: 5, maxStudents: 100, maxEmployees: 2, maxAssistants: 2, maxRooms: 3, commissionRate: 0.05, includesChat: true, includesExams: false, includesAssignments: false, includesAttendance: true, includesPayments: true, includesAnalytics: false, includesMultiBranch: false },
  { id: 'pkg-growth-m', name: 'باقة النمو', description: 'لباقة المتوسطة التي تحتاج اختبارات وواجبات وتقارير تحليل.', billingPeriod: 'MONTHLY', priceMonthly: 900, currency: 'EGP', maxTeachers: 15, maxStudents: 400, maxEmployees: 6, maxAssistants: 6, maxRooms: 10, commissionRate: 0.035, includesChat: true, includesExams: true, includesAssignments: true, includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: false },
  { id: 'pkg-growth-y', name: 'باقة النمو', description: 'سنة كاملة من إمكانيات باقة النمو بسعر مخفض.', billingPeriod: 'YEARLY', priceMonthly: 780, currency: 'EGP', maxTeachers: 15, maxStudents: 400, maxEmployees: 6, maxAssistants: 6, maxRooms: 10, commissionRate: 0.035, includesChat: true, includesExams: true, includesAssignments: true, includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: false },
  { id: 'pkg-enterprise-m', name: 'باقة المؤسسة', description: 'لمراكز التميز الكبيرة متعددة الفروع بكل الإمكانيات.', billingPeriod: 'MONTHLY', priceMonthly: 2200, currency: 'EGP', maxTeachers: null, maxStudents: null, maxEmployees: null, maxAssistants: null, maxRooms: null, commissionRate: 0.02, includesChat: true, includesExams: true, includesAssignments: true, includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: true },
  { id: 'pkg-enterprise-y', name: 'باقة المؤسسة', description: 'اشتراك سنوي لمراكز التميز متعددة الفروع بخصم يصل إلى 25%.', billingPeriod: 'YEARLY', priceMonthly: 1800, currency: 'EGP', maxTeachers: null, maxStudents: null, maxEmployees: null, maxAssistants: null, maxRooms: null, commissionRate: 0.02, includesChat: true, includesExams: true, includesAssignments: true, includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: true },
];