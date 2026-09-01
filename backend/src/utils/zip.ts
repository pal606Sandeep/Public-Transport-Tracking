/**
 * Minimal ZIP writer for the GTFS static export. Writes each file using the
 * STORED (method 0) flavour — no compression — so no third-party library is
 * needed. Supports multiple files in a single archive.
 *
 * Format reference: PKWARE APPNOTE.TXT (sections 4.3.7 Local File Header,
 * 4.3.12 Central Directory, 4.3.16 End of Central Directory Record).
 *
 * Each file is referenced from the central directory; the EOCD terminates
 * the archive. CRC-32 is computed with the standard polynomial 0xEDB88320
 * (little-endian).
 */

import { createHash } from "crypto";

const crcTable: number[] = (() => {
  const t: number[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf: Buffer): number => {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (d: Date): { date: number; time: number } => {
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
  return { date, time };
};

export interface ZipEntry {
  name: string;
  data: string | Buffer;
}

export const buildZip = (entries: ZipEntry[]): Buffer => {
  const localChunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const data = typeof entry.data === "string" ? Buffer.from(entry.data, "utf8") : entry.data;
    const crc = crc32(data);
    const { date, time } = dosDateTime(new Date());

    // Local file header (30 bytes + name + extra)
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method = STORED
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localChunks.push(local, nameBuf, data);

    // Central directory entry (46 bytes + name + extra + comment)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0, 8); // flags
    cd.writeUInt16LE(0, 10); // method
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20); // compressed size
    cd.writeUInt32LE(data.length, 24); // uncompressed size
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(offset, 42); // local header offset
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const localBuf = Buffer.concat(localChunks);
  const cdBuf = Buffer.concat(central);
  const cdOffset = localBuf.length;
  const cdSize = cdBuf.length;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // cd disk
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localBuf, cdBuf, eocd]);
};

/** Convenience: SHA-1 hex digest of a buffer (used for the ETag/sync checksum). */
export const sha1Hex = (buf: Buffer): string =>
  createHash("sha1").update(buf).digest("hex");

/** Convenience: list filenames from a ZIP buffer by reading the central directory. */
export const listZipEntries = (zip: Buffer): string[] => {
  const names: string[] = [];
  // Search for EOCD from the end (max comment 65535).
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      const total = zip.readUInt16LE(i + 10);
      const cdOffset = zip.readUInt32LE(i + 16);
      let p = cdOffset;
      for (let n = 0; n < total; n++) {
        if (zip.readUInt32LE(p) !== 0x02014b50) break;
        const nameLen = zip.readUInt16LE(p + 28);
        const name = zip.slice(p + 46, p + 46 + nameLen).toString("utf8");
        names.push(name);
        const extraLen = zip.readUInt16LE(p + 30);
        const commentLen = zip.readUInt16LE(p + 32);
        p += 46 + nameLen + extraLen + commentLen;
      }
      return names;
    }
  }
  return names;
};