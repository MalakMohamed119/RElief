export interface ProfileViewRow {
  key: string;
  label: string;
  value: unknown;
  isStructured: boolean;
}

const USER_PROFILE_MARKERS = [
  'firstName',
  'FirstName',
  'email',
  'Email',
  'lastName',
  'LastName',
  'id',
  'Id',
  'userId',
  'UserId',
  'fullName',
  'FullName',
];

const WRAPPER_KEYS = [
  'result',
  'Result',
  'value',
  'Value',
  'data',
  'Data',
  'profile',
  'Profile',
  'user',
  'User',
  'items',
  'Items',
  'payload',
  'Payload',
];

function looksLikeUserProfile(x: Record<string, unknown>): boolean {
  return USER_PROFILE_MARKERS.some((k) => Object.prototype.hasOwnProperty.call(x, k));
}

/**
 * Admin profile GET often returns `{ result: { ...user } }` or `{ value: ... }`.
 * Without this, the UI shows one "More" blob instead of Identity / Address.
 */
export function normalizeProfilePayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    if (raw.length === 1 && raw[0] != null && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return normalizeProfilePayload(raw[0]);
    }
    return null;
  }

  if (typeof raw !== 'object') return null;

  let o = raw as Record<string, unknown>;

  for (let depth = 0; depth < 6; depth++) {
    if (looksLikeUserProfile(o)) return o;

    let next: Record<string, unknown> | null = null;
    for (const k of WRAPPER_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      const inner = o[k];
      if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
        next = inner as Record<string, unknown>;
        break;
      }
      if (Array.isArray(inner) && inner.length === 1 && inner[0] != null && typeof inner[0] === 'object') {
        next = inner[0] as Record<string, unknown>;
        break;
      }
    }
    if (!next) return o;
    o = next;
  }

  return o;
}

export function isProfileImageUrlRow(row: ProfileViewRow): boolean {
  const k = row.key.toLowerCase();
  if (!k.includes('photo') && !k.includes('image') && !k.includes('avatar') && !k.includes('picture')) {
    return false;
  }
  const v = row.value;
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Profile fields that store a stored file id (GET /api/files/{id}/download-url). */
export function isProfileFileIdRow(row: ProfileViewRow): boolean {
  const v = row.value;
  if (typeof v !== 'string') return false;
  const id = v.trim();
  if (!UUID_RE.test(id)) return false;
  const k = row.key.toLowerCase().replace(/_/g, '');
  if (k.includes('fileid')) return true;
  if (k.includes('documentid')) return true;
  if (k.includes('attachmentid')) return true;
  return false;
}

export interface ProfileViewSection {
  title: string;
  rows: ProfileViewRow[];
}

const SECTION_KEYS: { title: string; keys: string[] }[] = [
  {
    title: 'Identity',
    keys: [
      'id',
      'Id',
      'userId',
      'UserId',
      'firstName',
      'FirstName',
      'lastName',
      'LastName',
      'fullName',
      'FullName',
      'email',
      'Email',
      'phoneNumber',
      'PhoneNumber',
      'role',
      'Role',
      'userName',
      'UserName',
      'address',
      'Address',
    ],
  },
  {
    title: 'Organization (care home)',
    keys: ['businessLicense', 'legalName', 'vaccinationPolicy'],
  },
  {
    title: 'Verification & status',
    keys: [
      'verificationStatus',
      'VerificationStatus',
      'isVerified',
      'IsVerified',
      'isProfileCompleted',
      'IsProfileCompleted',
      'emailConfirmed',
      'EmailConfirmed',
    ],
  },
  {
    title: 'PSW / profile',
    keys: [
      'proofIdentityType',
      'ProofIdentityType',
      'workStatus',
      'WorkStatus',
      'dateOfBirth',
      'DateOfBirth',
      'gender',
      'Gender',
      'profilePhoto',
      'ProfilePhoto',
    ],
  },
  {
    title: 'Documents',
    keys: [
      'proofIdentityFileId',
      'ProofIdentityFileId',
      'pswCertificateFileId',
      'PswCertificateFileId',
      'cvFileId',
      'CvFileId',
      'immunizationRecordFileId',
      'ImmunizationRecordFileId',
      'criminalRecordFileId',
      'CriminalRecordFileId',
      'firstAidOrCPRFileId',
      'FirstAidOrCPRFileId',
    ],
  },
];

const ADDRESS_FIELD_ORDER: { keys: string[]; label: string }[] = [
  { keys: ['apartmentNumber', 'ApartmentNumber'], label: 'Unit / apartment' },
  { keys: ['street', 'Street'], label: 'Street' },
  { keys: ['city', 'City'], label: 'City' },
  { keys: ['state', 'State'], label: 'State / province' },
  { keys: ['postalCode', 'PostalCode'], label: 'Postal code' },
  { keys: ['country', 'Country'], label: 'Country' },
];

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function humanizeKey(key: string): string {
  const k = key.replace(/_/g, ' ');
  return k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
}

function isStructuredValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0 && typeof v[0] === 'object';
  return typeof v === 'object';
}

function isPlainAddressObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    'street' in o ||
    'Street' in o ||
    'city' in o ||
    'City' in o ||
    'postalCode' in o ||
    'PostalCode' in o ||
    'country' in o ||
    'Country' in o
  );
}

function addressToRows(addr: Record<string, unknown>): ProfileViewRow[] {
  const rows: ProfileViewRow[] = [];
  const consumed = new Set<string>();

  for (const { keys, label } of ADDRESS_FIELD_ORDER) {
    for (const k of keys) {
      if (!Object.prototype.hasOwnProperty.call(addr, k)) continue;
      const value = addr[k];
      if (isEmpty(value)) continue;
      if (label === 'Unit / apartment' && (value === 0 || value === '0')) continue;
      consumed.add(k);
      rows.push({
        key: `address.${k}`,
        label,
        value,
        isStructured: false,
      });
      break;
    }
  }

  for (const k of Object.keys(addr).sort((a, b) => a.localeCompare(b))) {
    if (consumed.has(k)) continue;
    const value = addr[k];
    if (isEmpty(value)) continue;
    rows.push({
      key: `address.${k}`,
      label: humanizeKey(k),
      value,
      isStructured: isStructuredValue(value),
    });
  }

  return rows;
}

function parseIsoDate(val: unknown): Date | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatGender(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toLowerCase();
  const map: Record<string, string> = {
    '0': 'Unspecified',
    '1': 'Female',
    '2': 'Male',
    '3': 'Other',
    female: 'Female',
    male: 'Male',
    other: 'Other',
    unspecified: 'Unspecified',
  };
  if (map[s]) return map[s];
  if (typeof val === 'number' && map[String(val)]) return map[String(val)];
  return null;
}

export function buildProfileSections(profile: Record<string, unknown> | null): ProfileViewSection[] {
  if (!profile) return [];

  const used = new Set<string>();
  const sections: ProfileViewSection[] = [];

  for (const def of SECTION_KEYS) {
    const rows: ProfileViewRow[] = [];
    let identityAddressRows: ProfileViewRow[] | null = null;

    for (const key of def.keys) {
      if (!Object.prototype.hasOwnProperty.call(profile, key)) continue;
      const value = profile[key];
      if (isEmpty(value)) continue;

      if ((key === 'address' || key === 'Address') && isPlainAddressObject(value)) {
        used.add('address');
        used.add('Address');
        identityAddressRows = addressToRows(value);
        continue;
      }

      used.add(key);
      rows.push({
        key,
        label: humanizeKey(key),
        value,
        isStructured: isStructuredValue(value),
      });
    }

    if (rows.length > 0) {
      sections.push({ title: def.title, rows });
    }
    if (def.title === 'Identity' && identityAddressRows && identityAddressRows.length > 0) {
      sections.push({ title: 'Address', rows: identityAddressRows });
    }
  }

  const otherRows: ProfileViewRow[] = [];
  for (const key of Object.keys(profile).sort((a, b) => a.localeCompare(b))) {
    if (used.has(key)) continue;
    const value = profile[key];
    if (isEmpty(value)) continue;
    otherRows.push({
      key,
      label: humanizeKey(key),
      value,
      isStructured: isStructuredValue(value),
    });
  }
  if (otherRows.length > 0) {
    sections.push({ title: 'More', rows: otherRows });
  }

  return sections;
}

export function formatProfileCell(val: unknown, keyHint?: string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';

  const k = (keyHint ?? '').toLowerCase();
  if (k.includes('gender')) {
    const g = formatGender(val);
    if (g) return g;
  }
  if (
    k.includes('dateofbirth') ||
    k.includes('date_of_birth') ||
    k.includes('completedat') ||
    k.includes('createdat') ||
    k.includes('updatedat')
  ) {
    const d = parseIsoDate(val);
    if (d) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return '—';
      if (typeof val[0] !== 'object') return val.map(String).join(', ');
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }

  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const d = parseIsoDate(val);
    if (d) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  return String(val);
}
