import fallingThroughImage from "@/assets/creator-profile/falling-through.png";
import glasshouseImage from "@/assets/creator-profile/glasshouse.png";
import mayaProfileImage from "@/assets/creator-profile/maya-profile.png";
import nightSwimImage from "@/assets/creator-profile/night-swim.png";
import songwritingNotesImage from "@/assets/creator-profile/songwriting-notes.png";
import studioNotesImage from "@/assets/creator-profile/studio-notes.png";
import vocalChainImage from "@/assets/creator-profile/vocal-chain.png";

export type CreatorCredit = {
  id: string;
  title: string;
  artist: string;
  year: string;
  releaseType: string;
  contribution: string;
  image: string;
  verifiedAt: string;
  collaborators: string[];
  notes: string;
  collaboratedTracks?: {
    trackNumber: number;
    title: string;
    contribution: string;
  }[];
};

export type CreatorSpotlightItem = {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  duration: string;
  image: string;
  featured?: boolean;
  story?: {
    publishedAt: string;
    readTime: string;
    pullQuote: string;
    paragraphs: string[];
    credits: {
      label: string;
      names: string[];
    }[];
  };
};

export type CreatorProfile = {
  id: string;
  displayName: string;
  username: string;
  verified: boolean;
  profileImage: string;
  roles: string[];
  bio: string;
  location: string;
  verifiedCredits: number;
  socials: {
    instagram?: string;
    tiktok?: string;
    x?: string;
  };
  credits: CreatorCredit[];
  spotlight: CreatorSpotlightItem[];
};

export const mayaCreatorProfile: CreatorProfile = {
  id: "creator-maya-rios",
  displayName: "Maya Rios",
  username: "mayarios",
  verified: true,
  profileImage: mayaProfileImage,
  roles: ["Artist", "Producer", "Songwriter"],
  bio: "NYC artist and producer bending alt-R&B, soft distortion, and late-night rhythm.",
  location: "New York, NY",
  verifiedCredits: 87,
  socials: {
    instagram: "@mayarios",
    tiktok: "@mayarios",
    x: "@mayarios",
  },
  credits: [
    {
      id: "credit-night-swim",
      title: "Night Swim",
      artist: "Elena Shore",
      year: "2025",
      releaseType: "Single",
      contribution: "Lead vocals",
      image: nightSwimImage,
      verifiedAt: "Verified Jan 18, 2025",
      collaborators: ["Elena Shore", "Maya Rios", "Theo Grant"],
      notes: "Lead vocal performance and final chorus ad-libs verified from the signed SPLIT record.",
    },
    {
      id: "credit-glasshouse",
      title: "Glasshouse",
      artist: "Arlo Parks",
      year: "2024",
      releaseType: "EP",
      contribution: "Production",
      image: glasshouseImage,
      verifiedAt: "Verified Oct 02, 2024",
      collaborators: ["Arlo Parks", "Maya Rios", "June Vale"],
      notes: "Production credit verified across the main composition split and release metadata.",
      collaboratedTracks: [
        { trackNumber: 1, title: "Glasshouse", contribution: "Production" },
        { trackNumber: 3, title: "Soft Static", contribution: "Co-production" },
        { trackNumber: 5, title: "Room Tone", contribution: "Additional production" },
      ],
    },
    {
      id: "credit-falling-through",
      title: "Falling Through",
      artist: "Jordan Rakei",
      year: "2023",
      releaseType: "Single",
      contribution: "Songwriting",
      image: fallingThroughImage,
      verifiedAt: "Verified May 29, 2023",
      collaborators: ["Jordan Rakei", "Maya Rios"],
      notes: "Topline and bridge writing contribution approved by all listed collaborators.",
    },
    {
      id: "credit-after-hours",
      title: "After Hours",
      artist: "Maya Rios",
      year: "2022",
      releaseType: "Single",
      contribution: "Producer",
      image: studioNotesImage,
      verifiedAt: "Verified Nov 14, 2022",
      collaborators: ["Maya Rios", "Nico Slate"],
      notes: "Producer split confirmed alongside the released master and composition metadata.",
    },
    {
      id: "credit-drift-away",
      title: "Drift Away",
      artist: "Samia",
      year: "2021",
      releaseType: "EP",
      contribution: "Background vocals",
      image: mayaProfileImage,
      verifiedAt: "Verified Aug 03, 2021",
      collaborators: ["Samia", "Maya Rios", "Eli Finch"],
      notes: "Background vocal credit verified from a completed SPLIT sheet archive record.",
    },
  ],
  spotlight: [
    {
      id: "spotlight-night-swim",
      title: "Inside Night Swim",
      eyebrow: "Featured Story",
      description: "Breaking down the sounds, writing process, and late nights in the studio.",
      duration: "6:24",
      image: nightSwimImage,
      featured: true,
      story: {
        publishedAt: "Jan 2026",
        readTime: "4 min read",
        pullQuote: "The song started as a quiet vocal take, then turned into a whole world once the room lights went down.",
        credits: [
          { label: "Writers", names: ["Elena Shore", "Maya Rios", "Theo Grant"] },
          { label: "Producers", names: ["Theo Grant", "Maya Rios"] },
          { label: "Mix Engineer", names: ["Lena Park"] },
          { label: "Master Engineer", names: ["Sam Wills"] },
          { label: "A&R", names: ["Nico Slate"] },
        ],
        paragraphs: [
          "Night Swim began after midnight, with Maya cutting soft harmony stacks over a half-muted Rhodes loop. The session notes show the first pass was almost entirely instinctive: a close vocal, a low sub pulse, and a chorus melody that kept bending around the beat.",
          "Instead of polishing the edges, Maya leaned into the underwater feeling. Delays were printed a little too hot, breaths stayed in the comp, and the final lead vocal kept the pressure of the first demo.",
          "The early arrangement was sparse, almost empty by design. Maya asked the room to leave pockets around the voice, then used the negative space as part of the hook. A filtered synth enters only after the second phrase, and the drums never fully break the surface.",
          "That restraint became the emotional signature of the record. What sounds simple in the final mix is actually a chain of small decisions: the lead vocal sitting slightly forward, the doubles tucked low, the reverb blooming only at the end of certain lines.",
          "By the final bounce, Night Swim had become less about a single performance and more about atmosphere. The vocal carries the story, but the production keeps suggesting motion, like someone drifting through a room they know they have to leave.",
          "The verified SPLIT record credits Maya for lead vocals, but the story behind the credit is bigger than the line item. Her performance shaped the arrangement, giving the track its late-night drift and emotional center.",
        ],
      },
    },
    {
      id: "spotlight-glasshouse-process",
      title: "Building Glasshouse",
      eyebrow: "Studio Story",
      description: "How Maya shaped the EP's soft textures, vocal layers, and final production palette.",
      duration: "5:36",
      image: studioNotesImage,
      featured: true,
      story: {
        publishedAt: "Dec 2025",
        readTime: "5 min read",
        pullQuote: "Glasshouse needed to feel fragile without feeling small, like every sound had a little light passing through it.",
        credits: [
          { label: "Writers", names: ["Arlo Parks", "Maya Rios", "June Vale"] },
          { label: "Producers", names: ["Maya Rios", "June Vale"] },
          { label: "Mix Engineer", names: ["Lena Park"] },
          { label: "Master Engineer", names: ["Chris Gehringer"] },
          { label: "A&R", names: ["Mina Okafor"] },
        ],
        paragraphs: [
          "For Glasshouse, Maya focused on texture before structure. She built the first production pass out of clipped room tone, filtered guitar fragments, and layered vocal pads that barely announce themselves until the second chorus.",
          "The EP sessions kept a strict rule: every bright sound needed a shadow. That balance shows up across the tracks Maya touched, especially in the way the drums stay dry while the voices smear into the background.",
          "On the title track, the production started with a small piano figure and a vocal loop that was never meant to survive the demo. Maya kept both, then built around their imperfections: a pedal squeak, a clipped breath, and the slight distortion at the top of the loop.",
          "Soft Static moved in the other direction. The first version was dense, but the final arrangement came alive when Maya stripped it back to a few tactile pieces: a narrow snare, a warm pad, and background vocals that feel more like light than harmony.",
          "Room Tone became the EP's quiet anchor. Maya treated the ambient noise as a musical part, layering it underneath the outro so the track feels like it is dissolving back into the studio where it started.",
          "SPLIT's track-level credit detail matters here because the EP credit is not a blanket claim. Maya's verified work appears on the collaborated tracks only, giving fans and collaborators a clearer view of where her production hand actually enters the record.",
        ],
      },
    },
    {
      id: "spotlight-glasshouse",
      title: "Glasshouse - Studio Notes",
      eyebrow: "Session Notes",
      description: "A closer look at the rooms, references, and quiet production choices behind the EP.",
      duration: "4:18",
      image: studioNotesImage,
      story: {
        publishedAt: "Nov 2025",
        readTime: "4 min read",
        pullQuote: "The studio notes read less like instructions and more like a map of what not to overplay.",
        credits: [
          { label: "Writers", names: ["Arlo Parks", "Maya Rios", "June Vale"] },
          { label: "Producers", names: ["Maya Rios", "June Vale"] },
          { label: "Mix Engineer", names: ["Lena Park"] },
          { label: "Recording", names: ["Room 17, Brooklyn"] },
          { label: "A&R", names: ["Mina Okafor"] },
        ],
        paragraphs: [
          "The Glasshouse sessions were documented with unusually specific notes: which room tone to preserve, which vocal breaths to keep, and which synth parts should feel unfinished.",
          "Maya's production notes kept returning to one phrase: clear but breakable. That idea shaped the EP's sonic palette, from the thin percussion layers to the way the vocal stacks widen only when the lyric needs air.",
          "The final SPLIT metadata tells you who contributed, but the notes reveal how each contribution moved through the room. It turns a production credit into a view of the process behind the sound.",
        ],
      },
    },
    {
      id: "spotlight-falling-through",
      title: "Writing \"Falling Through\"",
      eyebrow: "Writing Room",
      description: "How a bridge idea became the emotional center of the single.",
      duration: "5:02",
      image: songwritingNotesImage,
      story: {
        publishedAt: "Sep 2025",
        readTime: "3 min read",
        pullQuote: "The bridge worked once it stopped explaining the feeling and started circling it.",
        credits: [
          { label: "Writers", names: ["Jordan Rakei", "Maya Rios"] },
          { label: "Producer", names: ["Jordan Rakei"] },
          { label: "Vocal Production", names: ["Maya Rios"] },
          { label: "Mix Engineer", names: ["Ben Baptie"] },
        ],
        paragraphs: [
          "Falling Through started with a chorus that was already locked. Maya's work happened around the edges: alternate pre-hook lines, a bridge melody, and the final shape of the background vocals.",
          "The session turned when the writing team stopped trying to add a new narrative turn and focused instead on repetition. A single phrase, sung differently each time, gave the bridge its weight.",
          "That is the kind of contribution SPLIT can make visible: not just who was in the room, but where the song changed because they were there.",
        ],
      },
    },
    {
      id: "spotlight-vocal-chain",
      title: "My Vocal Chain (2025)",
      eyebrow: "Creator Notes",
      description: "Maya breaks down the vocal texture behind recent sessions and released credits.",
      duration: "3:37",
      image: vocalChainImage,
      story: {
        publishedAt: "Jul 2025",
        readTime: "4 min read",
        pullQuote: "The chain is less about expensive gear and more about deciding how close the voice should feel.",
        credits: [
          { label: "Vocal Production", names: ["Maya Rios"] },
          { label: "Engineering", names: ["Nico Slate", "Maya Rios"] },
          { label: "Mix References", names: ["Night Swim", "After Hours"] },
          { label: "Studio", names: ["North Room"] },
        ],
        paragraphs: [
          "Maya's 2025 vocal chain is deliberately simple: a close mic, controlled saturation, and delays printed early enough that they become part of the performance rather than an effect pasted on later.",
          "The goal is intimacy without brittleness. On recent sessions, she has been carving space around the vocal before adding texture, letting the dry take decide how much atmosphere the track can hold.",
          "For SPLIT, a note like this gives collaborators a public-facing way to understand the craft behind a credit without exposing private files, rates, or deal terms.",
        ],
      },
    },
  ],
};

export const mockCreatorProfiles: CreatorProfile[] = [mayaCreatorProfile];
