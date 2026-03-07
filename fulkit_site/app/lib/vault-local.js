// Model A: Local-first vault via File System Access API
// Chromium-only (Chrome, Edge, Arc, Brave)

import { saveHandle, getHandle, clearHandle } from "./vault-idb";

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickVaultDirectory() {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await saveHandle(handle);
  return handle;
}

export async function restoreDirectoryHandle() {
  const handle = await getHandle();
  if (!handle) return null;

  // Re-verify permission — may prompt user after browser restart
  const permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") return null;

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
