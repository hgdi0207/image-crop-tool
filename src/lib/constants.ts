import { PresetConfig } from '@/types'

export const PRESET_LIST: PresetConfig[] = [
  // General
  { key: 'FreeForm',       label: 'Free Form',        ratio: null,              refWidth: null, refHeight: null },
  { key: 'Custom',         label: 'Custom',            ratio: null,              refWidth: null, refHeight: null },
  { key: 'Square',         label: 'Square',            ratio: 1,                 refWidth: 1080, refHeight: 1080 },
  { key: 'Monitor',        label: 'Monitor (4:3)',     ratio: 4 / 3,             refWidth: 1920, refHeight: 1440 },
  { key: 'Widescreen',     label: 'Widescreen',        ratio: 16 / 9,            refWidth: 1920, refHeight: 1080 },
  { key: 'Panorama',       label: 'Panorama',          ratio: 3 / 1,             refWidth: 3000, refHeight: 1000 },
  // Cinema
  { key: 'Film',           label: 'Film',              ratio: 1.85,              refWidth: 1998, refHeight: 1080 },
  { key: 'Cinemascope',    label: 'Cinemascope',       ratio: 2.39,              refWidth: 2048, refHeight:  856 },
  // Facebook
  { key: 'Facebookprofile',label: 'FB Profile',        ratio: 1,                 refWidth:  400, refHeight:  400 },
  { key: 'Facebookcover',  label: 'FB Cover',          ratio: 851 / 315,         refWidth:  851, refHeight:  315 },
  { key: 'Facebookpost',   label: 'FB Post',           ratio: 1200 / 630,        refWidth: 1200, refHeight:  630 },
  { key: 'Facebookad',     label: 'FB Ad',             ratio: 1200 / 628,        refWidth: 1200, refHeight:  628 },
  // Instagram
  { key: 'Instagramprofile',label: 'IG Profile',       ratio: 1,                 refWidth:  320, refHeight:  320 },
  { key: 'Instagrampost',  label: 'IG Post',           ratio: 1,                 refWidth: 1080, refHeight: 1080 },
  { key: 'Instagramstory', label: 'IG Story',          ratio: 9 / 16,            refWidth: 1080, refHeight: 1920 },
  // Twitter / X
  { key: 'Twitterprofile', label: 'X Profile',         ratio: 1,                 refWidth:  400, refHeight:  400 },
  { key: 'Twitterheader',  label: 'X Header',          ratio: 3 / 1,             refWidth: 1500, refHeight:  500 },
  { key: 'Twitterimage',   label: 'X Image',           ratio: 16 / 9,            refWidth: 1200, refHeight:  675 },
  { key: 'Twittercard',    label: 'X Card',            ratio: 800 / 418,         refWidth:  800, refHeight:  418 },
  { key: 'Twitterad',      label: 'X Ad',              ratio: 1200 / 628,        refWidth: 1200, refHeight:  628 },
  // YouTube
  { key: 'Youtubeprofile', label: 'YT Profile',        ratio: 1,                 refWidth:  800, refHeight:  800 },
  { key: 'Youtubechannelart',label: 'YT Channel Art',  ratio: 16 / 9,            refWidth: 2560, refHeight: 1440 },
  { key: 'Youtubethumb',   label: 'YT Thumbnail',      ratio: 16 / 9,            refWidth: 1280, refHeight:  720 },
  // Web Banners
  { key: 'Webmini',        label: 'Web Mini',          ratio: 320 / 50,          refWidth:  320, refHeight:   50 },
  { key: 'Websmall',       label: 'Web Small',         ratio: 468 / 60,          refWidth:  468, refHeight:   60 },
  { key: 'Webcommon',      label: 'Web Leaderboard',   ratio: 728 / 90,          refWidth:  728, refHeight:   90 },
  { key: 'Webmedium',      label: 'Web Rectangle',     ratio: 300 / 250,         refWidth:  300, refHeight:  250 },
  // Screen
  { key: 'FllHD',          label: 'Full HD',           ratio: 16 / 9,            refWidth: 1920, refHeight: 1080 },
  { key: 'UltraHD',        label: 'Ultra HD 4K',       ratio: 16 / 9,            refWidth: 3840, refHeight: 2160 },
  // Print
  { key: 'PaperA4',        label: 'A4 Portrait',       ratio: 2480 / 3508,       refWidth: 2480, refHeight: 3508 },
  { key: 'PaperA5',        label: 'A5 Portrait',       ratio: 1748 / 2480,       refWidth: 1748, refHeight: 2480 },
  { key: 'PaperA6',        label: 'A6 Portrait',       ratio: 1240 / 1748,       refWidth: 1240, refHeight: 1748 },
  { key: 'Paperletter',    label: 'US Letter',         ratio: 2550 / 3300,       refWidth: 2550, refHeight: 3300 },
]

export const PRESET_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'General',      keys: ['Square','Monitor','Widescreen','Panorama'] },
  { label: 'Cinema',       keys: ['Film','Cinemascope'] },
  { label: 'Facebook',     keys: ['Facebookprofile','Facebookcover','Facebookpost','Facebookad'] },
  { label: 'Instagram',    keys: ['Instagramprofile','Instagrampost','Instagramstory'] },
  { label: 'Twitter / X',  keys: ['Twitterprofile','Twitterheader','Twitterimage','Twittercard','Twitterad'] },
  { label: 'YouTube',      keys: ['Youtubeprofile','Youtubechannelart','Youtubethumb'] },
  { label: 'Web Banners',  keys: ['Webmini','Websmall','Webcommon','Webmedium'] },
  { label: 'Screen',       keys: ['FllHD','UltraHD'] },
  { label: 'Print',        keys: ['PaperA4','PaperA5','PaperA6','Paperletter'] },
]

export const MAX_FILE_SIZE_MB = 20
export const MAX_SAFE_DIMENSION = 4096
export const MIN_CROP_SIZE = 20
export const MAX_HISTORY_STEPS = 50
