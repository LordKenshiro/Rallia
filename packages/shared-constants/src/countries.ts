/**
 * Country codes data for phone input
 * Includes country name, ISO code, dial code, and flag emoji
 */

export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string;
  flag: string;
  /** Phone number format pattern using # as digit placeholder (e.g. "### ### ####") */
  phoneFormat: string;
  /** Maximum digits in the local phone number (excluding country code) */
  phoneLength: number;
}

export const COUNTRIES: Country[] = [
  // A
  {
    name: 'Afghanistan',
    code: 'AF',
    dialCode: '+93',
    flag: '\u{1F1E6}\u{1F1EB}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Albania',
    code: 'AL',
    dialCode: '+355',
    flag: '\u{1F1E6}\u{1F1F1}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Algeria',
    code: 'DZ',
    dialCode: '+213',
    flag: '\u{1F1E9}\u{1F1FF}',
    phoneFormat: '### ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'Andorra',
    code: 'AD',
    dialCode: '+376',
    flag: '\u{1F1E6}\u{1F1E9}',
    phoneFormat: '### ###',
    phoneLength: 6,
  },
  {
    name: 'Angola',
    code: 'AO',
    dialCode: '+244',
    flag: '\u{1F1E6}\u{1F1F4}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Antigua and Barbuda',
    code: 'AG',
    dialCode: '+1268',
    flag: '\u{1F1E6}\u{1F1EC}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Argentina',
    code: 'AR',
    dialCode: '+54',
    flag: '\u{1F1E6}\u{1F1F7}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Armenia',
    code: 'AM',
    dialCode: '+374',
    flag: '\u{1F1E6}\u{1F1F2}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Australia',
    code: 'AU',
    dialCode: '+61',
    flag: '\u{1F1E6}\u{1F1FA}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Austria',
    code: 'AT',
    dialCode: '+43',
    flag: '\u{1F1E6}\u{1F1F9}',
    phoneFormat: '### ######',
    phoneLength: 9,
  },
  {
    name: 'Azerbaijan',
    code: 'AZ',
    dialCode: '+994',
    flag: '\u{1F1E6}\u{1F1FF}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },

  // B
  {
    name: 'Bahamas',
    code: 'BS',
    dialCode: '+1242',
    flag: '\u{1F1E7}\u{1F1F8}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Bahrain',
    code: 'BH',
    dialCode: '+973',
    flag: '\u{1F1E7}\u{1F1ED}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Bangladesh',
    code: 'BD',
    dialCode: '+880',
    flag: '\u{1F1E7}\u{1F1E9}',
    phoneFormat: '#### ######',
    phoneLength: 10,
  },
  {
    name: 'Barbados',
    code: 'BB',
    dialCode: '+1246',
    flag: '\u{1F1E7}\u{1F1E7}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Belarus',
    code: 'BY',
    dialCode: '+375',
    flag: '\u{1F1E7}\u{1F1FE}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'Belgium',
    code: 'BE',
    dialCode: '+32',
    flag: '\u{1F1E7}\u{1F1EA}',
    phoneFormat: '### ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'Belize',
    code: 'BZ',
    dialCode: '+501',
    flag: '\u{1F1E7}\u{1F1FF}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Benin',
    code: 'BJ',
    dialCode: '+229',
    flag: '\u{1F1E7}\u{1F1EF}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Bhutan',
    code: 'BT',
    dialCode: '+975',
    flag: '\u{1F1E7}\u{1F1F9}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Bolivia',
    code: 'BO',
    dialCode: '+591',
    flag: '\u{1F1E7}\u{1F1F4}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Bosnia and Herzegovina',
    code: 'BA',
    dialCode: '+387',
    flag: '\u{1F1E7}\u{1F1E6}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Botswana',
    code: 'BW',
    dialCode: '+267',
    flag: '\u{1F1E7}\u{1F1FC}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Brazil',
    code: 'BR',
    dialCode: '+55',
    flag: '\u{1F1E7}\u{1F1F7}',
    phoneFormat: '## ##### ####',
    phoneLength: 11,
  },
  {
    name: 'Brunei',
    code: 'BN',
    dialCode: '+673',
    flag: '\u{1F1E7}\u{1F1F3}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Bulgaria',
    code: 'BG',
    dialCode: '+359',
    flag: '\u{1F1E7}\u{1F1EC}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Burkina Faso',
    code: 'BF',
    dialCode: '+226',
    flag: '\u{1F1E7}\u{1F1EB}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Burundi',
    code: 'BI',
    dialCode: '+257',
    flag: '\u{1F1E7}\u{1F1EE}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },

  // C
  {
    name: 'Cambodia',
    code: 'KH',
    dialCode: '+855',
    flag: '\u{1F1F0}\u{1F1ED}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Cameroon',
    code: 'CM',
    dialCode: '+237',
    flag: '\u{1F1E8}\u{1F1F2}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Canada',
    code: 'CA',
    dialCode: '+1',
    flag: '\u{1F1E8}\u{1F1E6}',
    phoneFormat: '(###) ###-####',
    phoneLength: 10,
  },
  {
    name: 'Cape Verde',
    code: 'CV',
    dialCode: '+238',
    flag: '\u{1F1E8}\u{1F1FB}',
    phoneFormat: '### ## ##',
    phoneLength: 7,
  },
  {
    name: 'Central African Republic',
    code: 'CF',
    dialCode: '+236',
    flag: '\u{1F1E8}\u{1F1EB}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Chad',
    code: 'TD',
    dialCode: '+235',
    flag: '\u{1F1F9}\u{1F1E9}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Chile',
    code: 'CL',
    dialCode: '+56',
    flag: '\u{1F1E8}\u{1F1F1}',
    phoneFormat: '# #### ####',
    phoneLength: 9,
  },
  {
    name: 'China',
    code: 'CN',
    dialCode: '+86',
    flag: '\u{1F1E8}\u{1F1F3}',
    phoneFormat: '### #### ####',
    phoneLength: 11,
  },
  {
    name: 'Colombia',
    code: 'CO',
    dialCode: '+57',
    flag: '\u{1F1E8}\u{1F1F4}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Comoros',
    code: 'KM',
    dialCode: '+269',
    flag: '\u{1F1F0}\u{1F1F2}',
    phoneFormat: '### ## ##',
    phoneLength: 7,
  },
  {
    name: 'Congo (DRC)',
    code: 'CD',
    dialCode: '+243',
    flag: '\u{1F1E8}\u{1F1E9}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Congo (Republic)',
    code: 'CG',
    dialCode: '+242',
    flag: '\u{1F1E8}\u{1F1EC}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Costa Rica',
    code: 'CR',
    dialCode: '+506',
    flag: '\u{1F1E8}\u{1F1F7}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: "C\u00F4te d'Ivoire",
    code: 'CI',
    dialCode: '+225',
    flag: '\u{1F1E8}\u{1F1EE}',
    phoneFormat: '## ## ## ## ##',
    phoneLength: 10,
  },
  {
    name: 'Croatia',
    code: 'HR',
    dialCode: '+385',
    flag: '\u{1F1ED}\u{1F1F7}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Cuba',
    code: 'CU',
    dialCode: '+53',
    flag: '\u{1F1E8}\u{1F1FA}',
    phoneFormat: '# ### ####',
    phoneLength: 8,
  },
  {
    name: 'Cyprus',
    code: 'CY',
    dialCode: '+357',
    flag: '\u{1F1E8}\u{1F1FE}',
    phoneFormat: '## ######',
    phoneLength: 8,
  },
  {
    name: 'Czech Republic',
    code: 'CZ',
    dialCode: '+420',
    flag: '\u{1F1E8}\u{1F1FF}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // D
  {
    name: 'Denmark',
    code: 'DK',
    dialCode: '+45',
    flag: '\u{1F1E9}\u{1F1F0}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Djibouti',
    code: 'DJ',
    dialCode: '+253',
    flag: '\u{1F1E9}\u{1F1EF}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Dominica',
    code: 'DM',
    dialCode: '+1767',
    flag: '\u{1F1E9}\u{1F1F2}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Dominican Republic',
    code: 'DO',
    dialCode: '+1809',
    flag: '\u{1F1E9}\u{1F1F4}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },

  // E
  {
    name: 'Ecuador',
    code: 'EC',
    dialCode: '+593',
    flag: '\u{1F1EA}\u{1F1E8}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Egypt',
    code: 'EG',
    dialCode: '+20',
    flag: '\u{1F1EA}\u{1F1EC}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'El Salvador',
    code: 'SV',
    dialCode: '+503',
    flag: '\u{1F1F8}\u{1F1FB}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Equatorial Guinea',
    code: 'GQ',
    dialCode: '+240',
    flag: '\u{1F1EC}\u{1F1F6}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Eritrea',
    code: 'ER',
    dialCode: '+291',
    flag: '\u{1F1EA}\u{1F1F7}',
    phoneFormat: '# ### ###',
    phoneLength: 7,
  },
  {
    name: 'Estonia',
    code: 'EE',
    dialCode: '+372',
    flag: '\u{1F1EA}\u{1F1EA}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Eswatini',
    code: 'SZ',
    dialCode: '+268',
    flag: '\u{1F1F8}\u{1F1FF}',
    phoneFormat: '## ## ####',
    phoneLength: 8,
  },
  {
    name: 'Ethiopia',
    code: 'ET',
    dialCode: '+251',
    flag: '\u{1F1EA}\u{1F1F9}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },

  // F
  {
    name: 'Fiji',
    code: 'FJ',
    dialCode: '+679',
    flag: '\u{1F1EB}\u{1F1EF}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Finland',
    code: 'FI',
    dialCode: '+358',
    flag: '\u{1F1EB}\u{1F1EE}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'France',
    code: 'FR',
    dialCode: '+33',
    flag: '\u{1F1EB}\u{1F1F7}',
    phoneFormat: '# ## ## ## ##',
    phoneLength: 9,
  },

  // G
  {
    name: 'Gabon',
    code: 'GA',
    dialCode: '+241',
    flag: '\u{1F1EC}\u{1F1E6}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Gambia',
    code: 'GM',
    dialCode: '+220',
    flag: '\u{1F1EC}\u{1F1F2}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Georgia',
    code: 'GE',
    dialCode: '+995',
    flag: '\u{1F1EC}\u{1F1EA}',
    phoneFormat: '### ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'Germany',
    code: 'DE',
    dialCode: '+49',
    flag: '\u{1F1E9}\u{1F1EA}',
    phoneFormat: '### #######',
    phoneLength: 10,
  },
  {
    name: 'Ghana',
    code: 'GH',
    dialCode: '+233',
    flag: '\u{1F1EC}\u{1F1ED}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Greece',
    code: 'GR',
    dialCode: '+30',
    flag: '\u{1F1EC}\u{1F1F7}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Grenada',
    code: 'GD',
    dialCode: '+1473',
    flag: '\u{1F1EC}\u{1F1E9}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Guatemala',
    code: 'GT',
    dialCode: '+502',
    flag: '\u{1F1EC}\u{1F1F9}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Guinea',
    code: 'GN',
    dialCode: '+224',
    flag: '\u{1F1EC}\u{1F1F3}',
    phoneFormat: '### ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'Guinea-Bissau',
    code: 'GW',
    dialCode: '+245',
    flag: '\u{1F1EC}\u{1F1FC}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Guyana',
    code: 'GY',
    dialCode: '+592',
    flag: '\u{1F1EC}\u{1F1FE}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },

  // H
  {
    name: 'Haiti',
    code: 'HT',
    dialCode: '+509',
    flag: '\u{1F1ED}\u{1F1F9}',
    phoneFormat: '## ## ####',
    phoneLength: 8,
  },
  {
    name: 'Honduras',
    code: 'HN',
    dialCode: '+504',
    flag: '\u{1F1ED}\u{1F1F3}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Hong Kong',
    code: 'HK',
    dialCode: '+852',
    flag: '\u{1F1ED}\u{1F1F0}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Hungary',
    code: 'HU',
    dialCode: '+36',
    flag: '\u{1F1ED}\u{1F1FA}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },

  // I
  {
    name: 'Iceland',
    code: 'IS',
    dialCode: '+354',
    flag: '\u{1F1EE}\u{1F1F8}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'India',
    code: 'IN',
    dialCode: '+91',
    flag: '\u{1F1EE}\u{1F1F3}',
    phoneFormat: '##### #####',
    phoneLength: 10,
  },
  {
    name: 'Indonesia',
    code: 'ID',
    dialCode: '+62',
    flag: '\u{1F1EE}\u{1F1E9}',
    phoneFormat: '### #### ####',
    phoneLength: 11,
  },
  {
    name: 'Iran',
    code: 'IR',
    dialCode: '+98',
    flag: '\u{1F1EE}\u{1F1F7}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Iraq',
    code: 'IQ',
    dialCode: '+964',
    flag: '\u{1F1EE}\u{1F1F6}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Ireland',
    code: 'IE',
    dialCode: '+353',
    flag: '\u{1F1EE}\u{1F1EA}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Israel',
    code: 'IL',
    dialCode: '+972',
    flag: '\u{1F1EE}\u{1F1F1}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Italy',
    code: 'IT',
    dialCode: '+39',
    flag: '\u{1F1EE}\u{1F1F9}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },

  // J
  {
    name: 'Jamaica',
    code: 'JM',
    dialCode: '+1876',
    flag: '\u{1F1EF}\u{1F1F2}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Japan',
    code: 'JP',
    dialCode: '+81',
    flag: '\u{1F1EF}\u{1F1F5}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Jordan',
    code: 'JO',
    dialCode: '+962',
    flag: '\u{1F1EF}\u{1F1F4}',
    phoneFormat: '# #### ####',
    phoneLength: 9,
  },

  // K
  {
    name: 'Kazakhstan',
    code: 'KZ',
    dialCode: '+7',
    flag: '\u{1F1F0}\u{1F1FF}',
    phoneFormat: '### ### ## ##',
    phoneLength: 10,
  },
  {
    name: 'Kenya',
    code: 'KE',
    dialCode: '+254',
    flag: '\u{1F1F0}\u{1F1EA}',
    phoneFormat: '### ######',
    phoneLength: 9,
  },
  {
    name: 'Kiribati',
    code: 'KI',
    dialCode: '+686',
    flag: '\u{1F1F0}\u{1F1EE}',
    phoneFormat: '## ###',
    phoneLength: 5,
  },
  {
    name: 'Kosovo',
    code: 'XK',
    dialCode: '+383',
    flag: '\u{1F1FD}\u{1F1F0}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Kuwait',
    code: 'KW',
    dialCode: '+965',
    flag: '\u{1F1F0}\u{1F1FC}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Kyrgyzstan',
    code: 'KG',
    dialCode: '+996',
    flag: '\u{1F1F0}\u{1F1EC}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // L
  {
    name: 'Laos',
    code: 'LA',
    dialCode: '+856',
    flag: '\u{1F1F1}\u{1F1E6}',
    phoneFormat: '## ## ### ###',
    phoneLength: 10,
  },
  {
    name: 'Latvia',
    code: 'LV',
    dialCode: '+371',
    flag: '\u{1F1F1}\u{1F1FB}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Lebanon',
    code: 'LB',
    dialCode: '+961',
    flag: '\u{1F1F1}\u{1F1E7}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Lesotho',
    code: 'LS',
    dialCode: '+266',
    flag: '\u{1F1F1}\u{1F1F8}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Liberia',
    code: 'LR',
    dialCode: '+231',
    flag: '\u{1F1F1}\u{1F1F7}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Libya',
    code: 'LY',
    dialCode: '+218',
    flag: '\u{1F1F1}\u{1F1FE}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Liechtenstein',
    code: 'LI',
    dialCode: '+423',
    flag: '\u{1F1F1}\u{1F1EE}',
    phoneFormat: '### ## ##',
    phoneLength: 7,
  },
  {
    name: 'Lithuania',
    code: 'LT',
    dialCode: '+370',
    flag: '\u{1F1F1}\u{1F1F9}',
    phoneFormat: '### #####',
    phoneLength: 8,
  },
  {
    name: 'Luxembourg',
    code: 'LU',
    dialCode: '+352',
    flag: '\u{1F1F1}\u{1F1FA}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // M
  {
    name: 'Macao',
    code: 'MO',
    dialCode: '+853',
    flag: '\u{1F1F2}\u{1F1F4}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Madagascar',
    code: 'MG',
    dialCode: '+261',
    flag: '\u{1F1F2}\u{1F1EC}',
    phoneFormat: '## ## ### ##',
    phoneLength: 9,
  },
  {
    name: 'Malawi',
    code: 'MW',
    dialCode: '+265',
    flag: '\u{1F1F2}\u{1F1FC}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Malaysia',
    code: 'MY',
    dialCode: '+60',
    flag: '\u{1F1F2}\u{1F1FE}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Maldives',
    code: 'MV',
    dialCode: '+960',
    flag: '\u{1F1F2}\u{1F1FB}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Mali',
    code: 'ML',
    dialCode: '+223',
    flag: '\u{1F1F2}\u{1F1F1}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Malta',
    code: 'MT',
    dialCode: '+356',
    flag: '\u{1F1F2}\u{1F1F9}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Marshall Islands',
    code: 'MH',
    dialCode: '+692',
    flag: '\u{1F1F2}\u{1F1ED}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Mauritania',
    code: 'MR',
    dialCode: '+222',
    flag: '\u{1F1F2}\u{1F1F7}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Mauritius',
    code: 'MU',
    dialCode: '+230',
    flag: '\u{1F1F2}\u{1F1FA}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Mexico',
    code: 'MX',
    dialCode: '+52',
    flag: '\u{1F1F2}\u{1F1FD}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Micronesia',
    code: 'FM',
    dialCode: '+691',
    flag: '\u{1F1EB}\u{1F1F2}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Moldova',
    code: 'MD',
    dialCode: '+373',
    flag: '\u{1F1F2}\u{1F1E9}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Monaco',
    code: 'MC',
    dialCode: '+377',
    flag: '\u{1F1F2}\u{1F1E8}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Mongolia',
    code: 'MN',
    dialCode: '+976',
    flag: '\u{1F1F2}\u{1F1F3}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Montenegro',
    code: 'ME',
    dialCode: '+382',
    flag: '\u{1F1F2}\u{1F1EA}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Morocco',
    code: 'MA',
    dialCode: '+212',
    flag: '\u{1F1F2}\u{1F1E6}',
    phoneFormat: '## ## ## ## ##',
    phoneLength: 10,
  },
  {
    name: 'Mozambique',
    code: 'MZ',
    dialCode: '+258',
    flag: '\u{1F1F2}\u{1F1FF}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Myanmar',
    code: 'MM',
    dialCode: '+95',
    flag: '\u{1F1F2}\u{1F1F2}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },

  // N
  {
    name: 'Namibia',
    code: 'NA',
    dialCode: '+264',
    flag: '\u{1F1F3}\u{1F1E6}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Nauru',
    code: 'NR',
    dialCode: '+674',
    flag: '\u{1F1F3}\u{1F1F7}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Nepal',
    code: 'NP',
    dialCode: '+977',
    flag: '\u{1F1F3}\u{1F1F5}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Netherlands',
    code: 'NL',
    dialCode: '+31',
    flag: '\u{1F1F3}\u{1F1F1}',
    phoneFormat: '# ## ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'New Zealand',
    code: 'NZ',
    dialCode: '+64',
    flag: '\u{1F1F3}\u{1F1FF}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Nicaragua',
    code: 'NI',
    dialCode: '+505',
    flag: '\u{1F1F3}\u{1F1EE}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Niger',
    code: 'NE',
    dialCode: '+227',
    flag: '\u{1F1F3}\u{1F1EA}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Nigeria',
    code: 'NG',
    dialCode: '+234',
    flag: '\u{1F1F3}\u{1F1EC}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'North Korea',
    code: 'KP',
    dialCode: '+850',
    flag: '\u{1F1F0}\u{1F1F5}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'North Macedonia',
    code: 'MK',
    dialCode: '+389',
    flag: '\u{1F1F2}\u{1F1F0}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Norway',
    code: 'NO',
    dialCode: '+47',
    flag: '\u{1F1F3}\u{1F1F4}',
    phoneFormat: '### ## ###',
    phoneLength: 8,
  },

  // O
  {
    name: 'Oman',
    code: 'OM',
    dialCode: '+968',
    flag: '\u{1F1F4}\u{1F1F2}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },

  // P
  {
    name: 'Pakistan',
    code: 'PK',
    dialCode: '+92',
    flag: '\u{1F1F5}\u{1F1F0}',
    phoneFormat: '### #######',
    phoneLength: 10,
  },
  {
    name: 'Palau',
    code: 'PW',
    dialCode: '+680',
    flag: '\u{1F1F5}\u{1F1FC}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Palestine',
    code: 'PS',
    dialCode: '+970',
    flag: '\u{1F1F5}\u{1F1F8}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Panama',
    code: 'PA',
    dialCode: '+507',
    flag: '\u{1F1F5}\u{1F1E6}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Papua New Guinea',
    code: 'PG',
    dialCode: '+675',
    flag: '\u{1F1F5}\u{1F1EC}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Paraguay',
    code: 'PY',
    dialCode: '+595',
    flag: '\u{1F1F5}\u{1F1FE}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Peru',
    code: 'PE',
    dialCode: '+51',
    flag: '\u{1F1F5}\u{1F1EA}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Philippines',
    code: 'PH',
    dialCode: '+63',
    flag: '\u{1F1F5}\u{1F1ED}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Poland',
    code: 'PL',
    dialCode: '+48',
    flag: '\u{1F1F5}\u{1F1F1}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Portugal',
    code: 'PT',
    dialCode: '+351',
    flag: '\u{1F1F5}\u{1F1F9}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Puerto Rico',
    code: 'PR',
    dialCode: '+1787',
    flag: '\u{1F1F5}\u{1F1F7}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },

  // Q
  {
    name: 'Qatar',
    code: 'QA',
    dialCode: '+974',
    flag: '\u{1F1F6}\u{1F1E6}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },

  // R
  {
    name: 'Romania',
    code: 'RO',
    dialCode: '+40',
    flag: '\u{1F1F7}\u{1F1F4}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Russia',
    code: 'RU',
    dialCode: '+7',
    flag: '\u{1F1F7}\u{1F1FA}',
    phoneFormat: '### ###-##-##',
    phoneLength: 10,
  },
  {
    name: 'Rwanda',
    code: 'RW',
    dialCode: '+250',
    flag: '\u{1F1F7}\u{1F1FC}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // S
  {
    name: 'Saint Kitts and Nevis',
    code: 'KN',
    dialCode: '+1869',
    flag: '\u{1F1F0}\u{1F1F3}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Saint Lucia',
    code: 'LC',
    dialCode: '+1758',
    flag: '\u{1F1F1}\u{1F1E8}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Saint Vincent and the Grenadines',
    code: 'VC',
    dialCode: '+1784',
    flag: '\u{1F1FB}\u{1F1E8}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Samoa',
    code: 'WS',
    dialCode: '+685',
    flag: '\u{1F1FC}\u{1F1F8}',
    phoneFormat: '## ####',
    phoneLength: 7,
  },
  {
    name: 'San Marino',
    code: 'SM',
    dialCode: '+378',
    flag: '\u{1F1F8}\u{1F1F2}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'S\u00E3o Tom\u00E9 and Pr\u00EDncipe',
    code: 'ST',
    dialCode: '+239',
    flag: '\u{1F1F8}\u{1F1F9}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Saudi Arabia',
    code: 'SA',
    dialCode: '+966',
    flag: '\u{1F1F8}\u{1F1E6}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Senegal',
    code: 'SN',
    dialCode: '+221',
    flag: '\u{1F1F8}\u{1F1F3}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'Serbia',
    code: 'RS',
    dialCode: '+381',
    flag: '\u{1F1F7}\u{1F1F8}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Seychelles',
    code: 'SC',
    dialCode: '+248',
    flag: '\u{1F1F8}\u{1F1E8}',
    phoneFormat: '# ### ###',
    phoneLength: 7,
  },
  {
    name: 'Sierra Leone',
    code: 'SL',
    dialCode: '+232',
    flag: '\u{1F1F8}\u{1F1F1}',
    phoneFormat: '## ######',
    phoneLength: 8,
  },
  {
    name: 'Singapore',
    code: 'SG',
    dialCode: '+65',
    flag: '\u{1F1F8}\u{1F1EC}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Slovakia',
    code: 'SK',
    dialCode: '+421',
    flag: '\u{1F1F8}\u{1F1F0}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Slovenia',
    code: 'SI',
    dialCode: '+386',
    flag: '\u{1F1F8}\u{1F1EE}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Solomon Islands',
    code: 'SB',
    dialCode: '+677',
    flag: '\u{1F1F8}\u{1F1E7}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Somalia',
    code: 'SO',
    dialCode: '+252',
    flag: '\u{1F1F8}\u{1F1F4}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'South Africa',
    code: 'ZA',
    dialCode: '+27',
    flag: '\u{1F1FF}\u{1F1E6}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'South Korea',
    code: 'KR',
    dialCode: '+82',
    flag: '\u{1F1F0}\u{1F1F7}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'South Sudan',
    code: 'SS',
    dialCode: '+211',
    flag: '\u{1F1F8}\u{1F1F8}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Spain',
    code: 'ES',
    dialCode: '+34',
    flag: '\u{1F1EA}\u{1F1F8}',
    phoneFormat: '### ## ## ##',
    phoneLength: 9,
  },
  {
    name: 'Sri Lanka',
    code: 'LK',
    dialCode: '+94',
    flag: '\u{1F1F1}\u{1F1F0}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Sudan',
    code: 'SD',
    dialCode: '+249',
    flag: '\u{1F1F8}\u{1F1E9}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Suriname',
    code: 'SR',
    dialCode: '+597',
    flag: '\u{1F1F8}\u{1F1F7}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Sweden',
    code: 'SE',
    dialCode: '+46',
    flag: '\u{1F1F8}\u{1F1EA}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'Switzerland',
    code: 'CH',
    dialCode: '+41',
    flag: '\u{1F1E8}\u{1F1ED}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'Syria',
    code: 'SY',
    dialCode: '+963',
    flag: '\u{1F1F8}\u{1F1FE}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // T
  {
    name: 'Taiwan',
    code: 'TW',
    dialCode: '+886',
    flag: '\u{1F1F9}\u{1F1FC}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Tajikistan',
    code: 'TJ',
    dialCode: '+992',
    flag: '\u{1F1F9}\u{1F1EF}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Tanzania',
    code: 'TZ',
    dialCode: '+255',
    flag: '\u{1F1F9}\u{1F1FF}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },
  {
    name: 'Thailand',
    code: 'TH',
    dialCode: '+66',
    flag: '\u{1F1F9}\u{1F1ED}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Timor-Leste',
    code: 'TL',
    dialCode: '+670',
    flag: '\u{1F1F9}\u{1F1F1}',
    phoneFormat: '#### ####',
    phoneLength: 8,
  },
  {
    name: 'Togo',
    code: 'TG',
    dialCode: '+228',
    flag: '\u{1F1F9}\u{1F1EC}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Tonga',
    code: 'TO',
    dialCode: '+676',
    flag: '\u{1F1F9}\u{1F1F4}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Trinidad and Tobago',
    code: 'TT',
    dialCode: '+1868',
    flag: '\u{1F1F9}\u{1F1F9}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Tunisia',
    code: 'TN',
    dialCode: '+216',
    flag: '\u{1F1F9}\u{1F1F3}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Turkey',
    code: 'TR',
    dialCode: '+90',
    flag: '\u{1F1F9}\u{1F1F7}',
    phoneFormat: '### ### ## ##',
    phoneLength: 10,
  },
  {
    name: 'Turkmenistan',
    code: 'TM',
    dialCode: '+993',
    flag: '\u{1F1F9}\u{1F1F2}',
    phoneFormat: '## ## ## ##',
    phoneLength: 8,
  },
  {
    name: 'Tuvalu',
    code: 'TV',
    dialCode: '+688',
    flag: '\u{1F1F9}\u{1F1FB}',
    phoneFormat: '## ####',
    phoneLength: 6,
  },

  // U
  {
    name: 'Uganda',
    code: 'UG',
    dialCode: '+256',
    flag: '\u{1F1FA}\u{1F1EC}',
    phoneFormat: '### ######',
    phoneLength: 9,
  },
  {
    name: 'Ukraine',
    code: 'UA',
    dialCode: '+380',
    flag: '\u{1F1FA}\u{1F1E6}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    dialCode: '+971',
    flag: '\u{1F1E6}\u{1F1EA}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    dialCode: '+44',
    flag: '\u{1F1EC}\u{1F1E7}',
    phoneFormat: '#### ######',
    phoneLength: 10,
  },
  {
    name: 'United States',
    code: 'US',
    dialCode: '+1',
    flag: '\u{1F1FA}\u{1F1F8}',
    phoneFormat: '(###) ###-####',
    phoneLength: 10,
  },
  {
    name: 'Uruguay',
    code: 'UY',
    dialCode: '+598',
    flag: '\u{1F1FA}\u{1F1FE}',
    phoneFormat: '## ### ###',
    phoneLength: 8,
  },
  {
    name: 'Uzbekistan',
    code: 'UZ',
    dialCode: '+998',
    flag: '\u{1F1FA}\u{1F1FF}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },

  // V
  {
    name: 'Vanuatu',
    code: 'VU',
    dialCode: '+678',
    flag: '\u{1F1FB}\u{1F1FA}',
    phoneFormat: '### ####',
    phoneLength: 7,
  },
  {
    name: 'Vatican City',
    code: 'VA',
    dialCode: '+379',
    flag: '\u{1F1FB}\u{1F1E6}',
    phoneFormat: '## #### ####',
    phoneLength: 10,
  },
  {
    name: 'Venezuela',
    code: 'VE',
    dialCode: '+58',
    flag: '\u{1F1FB}\u{1F1EA}',
    phoneFormat: '### ### ####',
    phoneLength: 10,
  },
  {
    name: 'Vietnam',
    code: 'VN',
    dialCode: '+84',
    flag: '\u{1F1FB}\u{1F1F3}',
    phoneFormat: '## ### ## ##',
    phoneLength: 9,
  },

  // Y
  {
    name: 'Yemen',
    code: 'YE',
    dialCode: '+967',
    flag: '\u{1F1FE}\u{1F1EA}',
    phoneFormat: '### ### ###',
    phoneLength: 9,
  },

  // Z
  {
    name: 'Zambia',
    code: 'ZM',
    dialCode: '+260',
    flag: '\u{1F1FF}\u{1F1F2}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
  {
    name: 'Zimbabwe',
    code: 'ZW',
    dialCode: '+263',
    flag: '\u{1F1FF}\u{1F1FC}',
    phoneFormat: '## ### ####',
    phoneLength: 9,
  },
];

// Default country (Canada)
export const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'CA') || COUNTRIES[0];

/**
 * Find a country by its ISO code
 */
export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
};

/**
 * Find a country by its dial code
 */
export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return COUNTRIES.find(c => c.dialCode === dialCode);
};

/**
 * Parse a phone number to extract country code and local number
 * Returns the country and the local number part
 */
export const parsePhoneNumber = (
  phoneNumber: string
): { country: Country | undefined; localNumber: string } => {
  if (!phoneNumber) {
    return { country: undefined, localNumber: '' };
  }

  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If starts with +, try to find the country
  if (cleaned.startsWith('+')) {
    // Try matching from longest dial code to shortest
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

    for (const country of sortedCountries) {
      if (cleaned.startsWith(country.dialCode)) {
        return {
          country,
          localNumber: cleaned.slice(country.dialCode.length),
        };
      }
    }
  }

  // No country code found, return the number as-is
  return { country: undefined, localNumber: cleaned.replace('+', '') };
};

/**
 * Format a full phone number with country code
 */
export const formatFullPhoneNumber = (dialCode: string, localNumber: string): string => {
  const cleaned = localNumber.replace(/\D/g, '');
  return `${dialCode}${cleaned}`;
};

/**
 * Format a local phone number according to a country's phone format pattern.
 * Uses '#' as digit placeholder in the format string.
 * Example: formatLocalNumber('5141234567', '(###) ###-####') => '(514) 123-4567'
 */
export const formatLocalNumber = (digits: string, format: string): string => {
  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned) return '';

  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < format.length && digitIndex < cleaned.length; i++) {
    if (format[i] === '#') {
      result += cleaned[digitIndex];
      digitIndex++;
    } else {
      result += format[i];
    }
  }

  return result;
};

/**
 * Find all countries matching a dial code (digits only, without '+').
 * Useful for country code input where multiple countries share the same dial code (e.g. US/CA with '1').
 */
export const getCountriesByDialDigits = (digits: string): Country[] => {
  const withPlus = `+${digits}`;
  return COUNTRIES.filter(c => c.dialCode === withPlus);
};
