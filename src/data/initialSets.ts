import { StudySet } from '../types/study';

export const INITIAL_STUDY_SETS: StudySet[] = [
  {
    id: 'set-tourism-week',
    title: 'Tourism Week Program Script & Flow',
    description: 'Complete opening ceremonies program, staging cues, protocol for guest speakers, and contingency plans for Mayor Cia & committee.',
    category: 'Tourism',
    tags: ['Tourism Week', 'Event Management', 'Mayor Protocol', 'Scripting'],
    fileName: 'Tourism Week Program Script & Flow.pdf',
    fileType: 'PDF',
    themeColor: 'pink',
    author: 'Mayor Cia & Carey',
    isPreset: true,
    isFavorite: true,
    createdAt: '2026-09-08T09:00:00Z',
    updatedAt: '2026-09-10T14:30:00Z',
    lastStudied: '2026-09-11T10:15:00Z',
    flashcards: [
      {
        id: 'tw-1',
        front: 'What is the primary role of the Stage Director during the Tourism Week Grand Opening ceremony?',
        back: 'The Stage Director oversees the timeline, calls stage cues (lights, audio, host entrances), and coordinates directly with the Floor Manager to keep the program on schedule.',
        hint: 'Think about who gives the green light behind the curtains.',
        category: 'Stage Direction',
        easeFactor: 2.6,
        interval: 3,
        repetitions: 2,
        nextReviewDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        state: 'review',
        aiExplanation: 'Mayor, ganito lang yan: Sila yung "conductor" ng orchestra ng event mo! Kapag sinabi nilang "Cue audio!", gagalaw ang tech. Para hindi maging magulo ang stage kapag pumasok na si Dean or guest speakers!'
      },
      {
        id: 'tw-2',
        front: 'What is the correct protocol when an invited VIP or Keynote Speaker arrives 15 minutes late?',
        back: 'Execute the buffer contingency: seamlessly transition to an extended cultural intermission / video presentation or acknowledge the next speaker while ushering the VIP to the holding room.',
        hint: 'Never leave dead air on stage.',
        category: 'Protocols',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString(), // due for review!
        state: 'learning',
        aiExplanation: 'Rule #1 ng event organizers: Bawal ang dead air! Habang inaayos ang mic o hinihintay si speaker, mag-play ng tourism promotional teaser video o tawagin muna ang intermission group.'
      },
      {
        id: 'tw-3',
        front: 'What are the 3 essential components of a Host Spoken Transition (Bridge)?',
        back: '1. Acknowledge & thank the previous performance/speaker.\n2. Reinforce the Tourism Week theme.\n3. Introduce the upcoming segment with excitement.',
        hint: 'Acknowledge -> Bridge/Theme -> Hype next segment.',
        category: 'Hosting & Scripting',
        easeFactor: 2.8,
        interval: 5,
        repetitions: 3,
        nextReviewDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        state: 'mastered',
        aiExplanation: 'Para hindi awkward ang lipat ng segments! Halimbawa: "Maraming salamat sa napakagandang Sayaw sa Bangko! Kitang-kita ang gilas ng kulturang Pilipino. At ngayon naman, ating pakinggan ang mensahe ng ating Dekano..."'
      },
      {
        id: 'tw-4',
        front: 'Define "House Rules" announcement timing and delivery in collegiate tourism events.',
        back: 'Delivered immediately prior to the official National Anthem and Doxology to ensure decorum, emergency exit awareness, and silent mobile phone compliance before solemn rites start.',
        hint: 'Right before the formal ceremonies begin.',
        category: 'Event Facilitation',
        easeFactor: 2.5,
        interval: 2,
        repetitions: 2,
        nextReviewDate: new Date().toISOString(), // due today!
        state: 'learning',
        aiExplanation: 'Kailangan sabihin ang house rules bago mag-anthem para tahimik na ang auditorium at alam ng lahat kung nasaan ang fire exit sakaling magka-emergency.'
      },
      {
        id: 'tw-5',
        front: 'What is a "Run-of-Show" (ROS) document and how does it differ from a Host Script?',
        back: 'An ROS is a high-level chronological cue sheet detailing exact minutes, technical requirements (audio/video cues), responsible staff, and stage action. A host script only contains spoken dialogue.',
        hint: 'ROS = technical matrix; Script = words spoken.',
        category: 'Event Management',
        easeFactor: 2.7,
        interval: 4,
        repetitions: 3,
        nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        state: 'mastered',
        aiExplanation: 'Ang script ay babasahin ng emcee, pero ang Run-of-Show ay hawak mo bilang Mayor at ng buong committee para alam kung sinong sasalang sa 10:15 AM at aling video ang ipa-flash!'
      }
    ],
    quizQuestions: [
      {
        id: 'twq-1',
        type: 'multiple_choice',
        question: 'During Tourism Week opening rites, who has the final authority to give cue for the ceremonial ribbon cutting?',
        options: [
          'Floor Director / Stage Manager',
          'The Audio Technician',
          'Any available host',
          'Audience Coordinator'
        ],
        correctAnswer: 'Floor Director / Stage Manager',
        explanation: 'The Floor Director / Stage Manager coordinates with both technical booth and VIP ushers before signaling the hosts and dignitaries.',
        topicCategory: 'Stage Direction'
      },
      {
        id: 'twq-2',
        type: 'true_false',
        question: 'True or False: In formal university programs, the National Anthem should always come after the guest keynote speaker.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'Protocol dictates that the National Anthem and Doxology open the formal ceremony before any speeches or keynote addresses commence.',
        topicCategory: 'Protocols'
      },
      {
        id: 'twq-3',
        type: 'identification',
        question: 'What term refers to the detailed minute-by-minute timeline used by event production staff containing lighting, audio, and stage cues?',
        correctAnswer: 'Run of Show',
        explanation: 'The Run of Show (ROS) or Production Cue Sheet is the master roadmap for stage and technical staff.',
        topicCategory: 'Event Management'
      },
      {
        id: 'twq-4',
        type: 'multiple_choice',
        question: 'If audio feedback (high pitch screech) suddenly occurs on the wireless lapel mic, what is the first action required?',
        options: [
          'Sound engineer cuts gain immediately on master fader / mute lapel channel',
          'Have the speaker scream louder into the mic',
          'Turn off the auditorium main circuit breaker',
          'Instruct the host to run off the stage'
        ],
        correctAnswer: 'Sound engineer cuts gain immediately on master fader / mute lapel channel',
        explanation: 'Cutting gain or muting the problematic channel stops feedback loop instantly while preserving the speaker’s hearing and audio equipment.',
        topicCategory: 'Contingency'
      }
    ],
    summary: {
      overview: 'This comprehensive guide covers the critical event management, stage direction, and VIP protocol standards required for the grand execution of Tourism Week. It emphasizes strict timekeeping, seamless host transitions, technical booth synchronization, and emergency contingencies.',
      keyConcepts: [
        {
          title: 'Run-of-Show Synchronization',
          explanation: 'The backbone of event pacing and technical alignment between stage and booth.',
          keyPoints: [
            'Time-blocked in 5-minute to 15-minute segments.',
            'Distinct columns for Audio/Visual Cues, Floor Action, and Staff Assigned.',
            'Buffer time of 10 minutes built into the schedule for VIP delays.'
          ]
        },
        {
          title: 'VIP Dignitary Protocol',
          explanation: 'Guarantees utmost respect and proper institutional etiquette for invited leaders and deans.',
          keyPoints: [
            'Designated usher per VIP delegation.',
            'Holding room refreshments and briefing package provided 20 minutes prior.',
            'Correct order of precedence during introductions.'
          ]
        }
      ],
      glossary: [
        { term: 'Run of Show (ROS)', definition: 'Minute-by-minute timeline showing all production cues, speaker entrances, and AV transitions.' },
        { term: 'Holding Room', definition: 'A quiet, dedicated lounge where keynote speakers and guests prepare prior to stage entrance.' },
        { term: 'Buffer Contingency', definition: 'Pre-planned flexible segment (e.g. video, instrumental, teaser) used to absorb unplanned schedule delays.' }
      ],
      examQuestions: [
        {
          question: 'Discuss three critical actions a Floor Director must take if the projector display fails during a speaker presentation.',
          modelAnswer: '1. Instantly notify the tech booth via comms headset.\n2. Prompt host to thank audience and briefly summarize the speaker’s credential or topic verbally.\n3. Switch to backup HDMI cable or secondary laptop mirror without stopping the speaker dialogue.',
          difficulty: 'Medium'
        }
      ]
    }
  },
  {
    id: 'set-accounting-finance',
    title: 'Accounting & Financial Management',
    description: 'Fundamental accounting concepts, balance sheet equations, petty cash management, and financial control for student organizations.',
    category: 'Accounting',
    tags: ['Accounting', 'Financial Statements', 'Petty Cash', 'Mayor Audit'],
    fileName: 'Accounting & Financial Management.docx',
    fileType: 'DOCX',
    themeColor: 'blue',
    author: 'Mayor Cia',
    isPreset: true,
    isFavorite: true,
    createdAt: '2026-09-07T11:00:00Z',
    updatedAt: '2026-09-10T16:00:00Z',
    lastStudied: '2026-09-11T08:30:00Z',
    flashcards: [
      {
        id: 'acc-1',
        front: 'State the fundamental accounting equation and what each element represents.',
        back: 'Assets = Liabilities + Owner’s Equity.\n- Assets: Resources owned that yield future economic benefits.\n- Liabilities: Debts or obligations owed to outside parties.\n- Equity: Residual interest in assets after deducting liabilities.',
        hint: 'A = L + E',
        category: 'Core Equation',
        easeFactor: 2.7,
        interval: 6,
        repetitions: 3,
        nextReviewDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        state: 'mastered',
        aiExplanation: 'Ito ang foundation ng accounting, Pretty Mayor! Lahat ng pag-aari ng organization (Assets) ay galing either sa inutang (Liabilities) o sa sariling ambag/pondo ng members (Equity).'
      },
      {
        id: 'acc-2',
        front: 'Explain the Imprest System of Petty Cash Fund.',
        back: 'A fixed cash fund maintained for small, recurring daily expenses. When depleted, it is replenished for the exact total amount spent, backed by valid official receipts, resetting the balance to the original imprest amount.',
        hint: 'Fixed amount replenished to match exact receipts submitted.',
        category: 'Cash Management',
        easeFactor: 2.4,
        interval: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString(), // due today!
        state: 'learning',
        aiExplanation: 'Halimbawa: May ₱5,000 petty cash si Treasurer. Gumastos ng ₱2,300 para sa bond paper at markers (may resibo). Hihingi siya ng refund na exactong ₱2,300 para bumalik sa ₱5,000 ang pondo!'
      },
      {
        id: 'acc-3',
        front: 'What is the distinction between Cash Basis and Accrual Basis accounting?',
        back: 'Cash Basis recognizes revenues when cash is received and expenses when cash is paid. Accrual Basis recognizes revenues when earned and expenses when incurred, regardless of cash flow timing.',
        hint: 'When money moves vs when the transaction actually happens.',
        category: 'Accounting Principles',
        easeFactor: 2.6,
        interval: 4,
        repetitions: 2,
        nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        state: 'review',
        aiExplanation: 'Sa Accrual, kahit hindi pa nagbabayad si classmate ng registration fee, basta nag-register na at na-render ang service, recorded na as revenue (Accounts Receivable).'
      },
      {
        id: 'acc-4',
        front: 'What is the matching principle in financial accounting?',
        back: 'Expenses must be reported in the same period as the revenues that they helped generate, ensuring accurate calculation of net profit or loss.',
        hint: 'Expenses follow the revenues they helped produce.',
        category: 'GAAP',
        easeFactor: 2.5,
        interval: 2,
        repetitions: 2,
        nextReviewDate: new Date().toISOString(), // due today!
        state: 'learning',
        aiExplanation: 'Kung ngayong Tourism Week kumita ang booth ng ticket sales, lahat ng gastos sa materials ng booth ay dapat i-record ngayong buwan din para accurate ang net income!'
      }
    ],
    quizQuestions: [
      {
        id: 'accq-1',
        type: 'multiple_choice',
        question: 'If a student organization purchases ₱3,500 worth of booth decoration supplies on credit, how does this affect the accounting equation?',
        options: [
          'Assets increase by ₱3,500 and Liabilities increase by ₱3,500',
          'Assets decrease by ₱3,500 and Equity decreases by ₱3,500',
          'Only Liabilities increase',
          'No change to the balance sheet'
        ],
        correctAnswer: 'Assets increase by ₱3,500 and Liabilities increase by ₱3,500',
        explanation: 'Supplies (Asset) increase by ₱3,500, and Accounts Payable (Liability) increases by ₱3,500, keeping the equation in balance.',
        topicCategory: 'Core Equation'
      },
      {
        id: 'accq-2',
        type: 'true_false',
        question: 'True or False: Official receipts (ORs) are required before a disbursement can be liquidated from petty cash under standard audit guidelines.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Auditing standards require valid official receipts or signed acknowledgment receipts to substantiate every petty cash expenditure.',
        topicCategory: 'Cash Management'
      },
      {
        id: 'accq-3',
        type: 'identification',
        question: 'What financial statement summarizes an organization’s revenues, expenses, and net surplus or deficit over a specified reporting period?',
        correctAnswer: 'Income Statement',
        explanation: 'The Income Statement (Statement of Comprehensive Income / Operations) reports the financial performance over time.',
        topicCategory: 'Financial Statements'
      }
    ],
    summary: {
      overview: 'A high-yield summary of financial stewardship, cash flow transparency, and balance sheet mechanics vital for collegiate class representatives and organizational treasurers.',
      keyConcepts: [
        {
          title: 'Dual-Entry Bookkeeping',
          explanation: 'Every transaction affects at least two accounts in order to keep the fundamental equation in equilibrium.',
          keyPoints: [
            'Debits on the left; Credits on the right.',
            'Total debits must always equal total credits.',
            'Assets and Expenses increase with debits; Liabilities, Equity, and Revenue increase with credits.'
          ]
        },
        {
          title: 'Internal Financial Controls',
          explanation: 'Procedures that safeguard assets and prevent misallocation of student funds.',
          keyPoints: [
            'Segregation of custody and recordkeeping.',
            'Independent monthly bank and cash reconciliations.',
            'Standardized approval vouchers for disbursements.'
          ]
        }
      ],
      glossary: [
        { term: 'Liquidity', definition: 'The ease and speed with which an asset can be converted into ready cash without losing value.' },
        { term: 'Voucher System', definition: 'A set of formal review and authorization procedures for verifying expenditures before checks or cash are disbursed.' },
        { term: 'Accounts Receivable', definition: 'Money owed to the organization by members or external clients for services rendered on credit.' }
      ],
      examQuestions: [
        {
          question: 'Why is the Imprest Fund System preferred over random cash replenishment in organizational budgeting?',
          modelAnswer: 'Because it enforces strict accountability: cash is only replaced upon presenting verified physical receipts totaling the exact replenishment sum, maintaining a constant verifiable ceiling.',
          difficulty: 'Hard'
        }
      ]
    }
  },
  {
    id: 'set-traditional-dance',
    title: 'Traditional Dance & Booth Committee Notes',
    description: 'Cultural festival coordination, Philippine folk dance background, booth structural logistics, and student council committee staging.',
    category: 'Tourism',
    tags: ['Folk Dance', 'Booth Staging', 'Cultural Fest', 'Logistics'],
    fileName: 'Traditional Dance & Booth Committee Notes.pptx',
    fileType: 'PPTX',
    themeColor: 'lavender',
    author: 'Mayor Cia & Committee',
    isPreset: true,
    isFavorite: false,
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-09-09T15:00:00Z',
    lastStudied: '2026-09-10T11:20:00Z',
    flashcards: [
      {
        id: 'td-1',
        front: 'What are the three major cultural dance classifications in Philippine folk traditions?',
        back: '1. Cordillera / Tribal dances (e.g., Banga, Pattong).\n2. Spanish-influenced / Maria Clara dances (e.g., Carinosa, Jota).\n3. Muslim / Mindanao royalty dances (e.g., Singkil, Pangalay).',
        hint: 'Northern highlands, colonial ballroom, southern sultanate.',
        category: 'Folkloric Heritage',
        easeFactor: 2.5,
        interval: 3,
        repetitions: 2,
        nextReviewDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        state: 'review',
        aiExplanation: 'Tatlong malalaking grupo ng sayaw sa Pilipinas na kadalasang pinipili sa cultural festivals! Bawat isa may sariling costume, tempo, at props.'
      },
      {
        id: 'td-2',
        front: 'What are the safety requirements for bamboo pole handling in Singkil and Tinikling performances?',
        back: 'Poles must be smoothed and sanded to prevent splinters; clappers must maintain synchronized rhythm with eyes on dancers’ ankles; cushioning mats under pole ends reduce floor reverberation.',
        hint: 'Think about splinters, foot collision, and floor protection.',
        category: 'Performance Safety',
        easeFactor: 2.7,
        interval: 5,
        repetitions: 3,
        nextReviewDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        state: 'mastered',
        aiExplanation: 'Ingat palagi sa paa ng dancers! Dapat may padding at laging may practice bago mag-perform on stage.'
      },
      {
        id: 'td-3',
        front: 'List the 4 key booth logistics checkpoints before public festival gates open.',
        back: '1. Electrical load safety & taped cord pathways.\n2. Fire extinguisher placement.\n3. Cash register/till placement behind secure partition.\n4. Clear trash separation bins (biodegradable, non-biodegradable).',
        hint: 'Wires, fire safety, cash security, sanitation.',
        category: 'Booth Operations',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString(), // due today!
        state: 'learning',
        aiExplanation: 'Ito yung laging tinitingnan ng inspectors at Dean bago payagan buksan ang student booths!'
      }
    ],
    quizQuestions: [
      {
        id: 'tdq-1',
        type: 'multiple_choice',
        question: 'Which iconic Filipino folk dance traditionally mimics the movement of the tikling bird hopping between grass stems and bamboo traps?',
        options: ['Tinikling', 'Singkil', 'Pandanggo sa Ilaw', 'Maglalatik'],
        correctAnswer: 'Tinikling',
        explanation: 'Tinikling originates from Leyte and imitates the swift movements of the tikling bird escaping wooden bamboo traps.',
        topicCategory: 'Folkloric Heritage'
      },
      {
        id: 'tdq-2',
        type: 'true_false',
        question: 'True or False: Electrical extension cords in outdoor student booths may lie exposed across pedestrian walkways as long as they are colored bright orange.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'All cords across pedestrian pathways must be covered with rubber cable ramps or heavy-duty tape to avoid tripping hazards and electrocution.',
        topicCategory: 'Booth Operations'
      }
    ],
    summary: {
      overview: 'Practical coordination guide blending cultural preservation with strict campus event staging, electrical safety, and crowd control standards for student booths.',
      keyConcepts: [
        {
          title: 'Cultural Authenticity & Respect',
          explanation: 'Ensuring props and music accurately reflect regional heritage.',
          keyPoints: ['Accurate attire adherence.', 'No sacrilegious alteration of sacred tribal symbols.', 'Acknowledge regional origins in emcee spiel.']
        }
      ],
      glossary: [
        { term: 'Singkil', definition: 'A Maranao royal dance recounting an episode from the Darangen epic with crisscrossed bamboo poles.' },
        { term: 'Cable Ramp', definition: 'A durable polyurethane ramp designed to protect high-voltage cables from pedestrian foot traffic.' }
      ],
      examQuestions: [
        {
          question: 'How do booth staging layout plans impact crowd congestion in collegiate hallways?',
          modelAnswer: 'A unidirectional queue flow with queue stanchions prevents bottlenecking at narrow corridors, leaving central pathways open for emergency exits.',
          difficulty: 'Medium'
        }
      ]
    }
  },
  {
    id: 'set-pbb-facilitation',
    title: 'PBB / Event Facilitation Guide',
    description: 'Icebreakers, team building mechanics, crowd engagement strategies, microphone techniques, and house rules facilitation.',
    category: 'Events',
    tags: ['Facilitation', 'PBB Mechanics', 'Icebreakers', 'Class Rep Leadership'],
    fileName: 'PBB / Event Facilitation Guide.pdf',
    fileType: 'PDF',
    themeColor: 'pink',
    author: 'Chobee & Mayor Cia',
    isPreset: true,
    isFavorite: false,
    createdAt: '2026-09-05T14:00:00Z',
    updatedAt: '2026-09-08T18:00:00Z',
    lastStudied: '2026-09-09T16:00:00Z',
    flashcards: [
      {
        id: 'pbb-1',
        front: 'What is the "3-Second Rule" of crowd engagement for stage facilitators?',
        back: 'If the room is losing focus, change your stimulus within 3 seconds: shift your vocal cadence, use a call-and-response chant, or move to another part of the stage.',
        hint: 'Voice, movement, or call-and-response.',
        category: 'Crowd Facilitation',
        easeFactor: 2.6,
        interval: 4,
        repetitions: 2,
        nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        state: 'review',
        aiExplanation: 'Kapag napansin mong nagce-cellphone na ang audience, huwag manatiling nakatayo lang! Magpatawa o magpa-chant para bumalik agad ang energy nila!'
      },
      {
        id: 'pbb-2',
        front: 'How should a facilitator handle an unruly or overly competitive participant during a group challenge?',
        back: 'Acknowledge their passion positively, gently reiterate the core principle of sportsmanship and fun, and redirect focus toward collective team celebration.',
        hint: 'De-escalate with humor and positive redirection.',
        category: 'Conflict Resolution',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewDate: new Date().toISOString(), // due today!
        state: 'learning',
        aiExplanation: 'Huwag pagalitan sa mic! Sabihin with a smile: "Love the energy, Team Blue! Pero tandaan, friends pa rin tayong lahat pagkatapos nito!"'
      }
    ],
    quizQuestions: [
      {
        id: 'pbbq-1',
        type: 'multiple_choice',
        question: 'Which microphone technique prevents plosive "popping" sounds (P and B sounds) during loud cheering?',
        options: [
          'Holding the microphone at a 45-degree angle below the chin',
          'Pressing the microphone directly against the lips',
          'Speaking directly on top of the capsule',
          'Turning the gain up to maximum'
        ],
        correctAnswer: 'Holding the microphone at a 45-degree angle below the chin',
        explanation: 'Tilting the mic at a 45-degree angle allows air bursts from plosive consonants to pass over the diaphragm instead of striking it directly.',
        topicCategory: 'Technical Skills'
      }
    ],
    summary: {
      overview: 'Practical handbook for emcees, class mayors, and student moderators directing high-energy collegiate team building and auditorium events.',
      keyConcepts: [
        {
          title: 'Energy Contagion',
          explanation: 'The room matches the facilitator’s emotional posture and vocal enthusiasm.',
          keyPoints: ['Start with 110% energy to get 80% audience response.', 'Use warm inclusive humor.', 'Praise participation quickly.']
        }
      ],
      glossary: [
        { term: 'Call and Response', definition: 'A participatory technique where the facilitator calls a prompt and the audience answers in unison.' }
      ],
      examQuestions: [
        {
          question: 'Why is clear debriefing crucial after competitive group games?',
          modelAnswer: 'Debriefing bridges playful fun with educational takeaways, reinforcing collaboration and shared goals rather than winning alone.',
          difficulty: 'Easy'
        }
      ]
    }
  }
];
