// Model A: Local-first vault via File System Access API
// Chromium-only (Chrome, Edge, Arc, Brave)

import { saveHandle, getHandle, clearHandle } from "./vault-idb";

export function isFileSystemAccessSupported() {
  if (typeof window === "undefined") return false;
  if (!("showDirectoryPicker" in window)) return false;
  // Mobile Chrome exposes showDirectoryPicker but it doesn't work — exclude mobile
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
  return true;
}

const REQUIRED_FOLDERS = [
  "_FULKIT", "00-INBOX", "01-PERSONAL", "02-BUSINESS",
  "03-PROJECTS", "04-DEV", "05-IDEAS", "06-LEARNING", "07-ARCHIVE",
];

// Validate vault structure — auto-create missing folders
export async function validateVaultStructure(handle) {
  const missing = [];
  for (const folder of REQUIRED_FOLDERS) {
    try {
      await handle.getDirectoryHandle(folder);
    } catch {
      await handle.getDirectoryHandle(folder, { create: true });
      missing.push(folder);
    }
  }
  return missing;
}

export async function pickVaultDirectory() {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await validateVaultStructure(handle);
  await saveHandle(handle);
  return handle;
}

export async function restoreDirectoryHandle() {
  const handle = await getHandle();
  if (!handle) return null;

  // Re-verify permission — may prompt user after browser restart
  const permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") return null;

  await validateVaultStructure(handle);
  return handle;
}

export async function disconnectVault() {
  await clearHandle();
}

// Recursively read all .md files from a directory handle
export async function readLocalVault(handle) {
  const files = [];
  await readDirectory(handle, "", files);
  return files;
}

// Write a note as a .md file to the vault folder
export async function writeLocalNote(handle, folder, title, content) {
  if (!handle) throw new Error("No vault connected");
  const safeName = title.replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
  const dirHandle = await handle.getDirectoryHandle(folder || "00-INBOX", { create: true });
  const fileHandle = await dirHandle.getFileHandle(safeName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return `${folder || "00-INBOX"}/${safeName}`;
}

// Delete a note from the vault folder
export async function deleteLocalNote(handle, folder, title) {
  if (!handle) return;
  const safeName = title.replace(/[/\\?%*:|"<>]/g, "-").trim() + ".md";
  try {
    const dirHandle = await handle.getDirectoryHandle(folder || "00-INBOX");
    await dirHandle.removeEntry(safeName);
  } catch {
    // File may not exist — that's fine
  }
}

async function readDirectory(dirHandle, path, files) {
  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;

    // Skip hidden directories/files
    if (entry.name.startsWith(".")) continue;

    if (entry.kind === "directory") {
      // Skip archive directories
      if (entry.name.toLowerCase().includes("archive")) continue;
      const subDir = await dirHandle.getDirectoryHandle(entry.name);
      await readDirectory(subDir, entryPath, files);
    } else if (entry.kind === "file" && entry.name.endsWith(".md")) {
      try {
        const file = await entry.getFile();
        const content = await file.text();
        files.push({
          title: entry.name.replace(/\.md$/, ""),
          content,
          path: entryPath,
        });
      } catch {
        // Skip files we can't read
      }
    }
  }
}
