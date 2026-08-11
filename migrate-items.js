// ============================================================
// MIGRATION SCRIPT — run this in the browser console
// while signed into the live site (either account works).
//
// What it does:
//   1. Reads every doc in the old top-level `items` collection
//   2. Maps old string categories -> categoryId
//   3. Writes each into households/fazafizo-batoot/items/{same id}
//   4. Logs a summary so you can verify counts match
//
// It does NOT delete anything from the old collection.
// Safe to run more than once (it overwrites, doesn't duplicate).
// ============================================================

(async function migrate() {
  const { getFirestore, collection, getDocs, doc, setDoc } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  const db = getFirestore();
  const HOUSEHOLD_ID = "fazafizo-batoot";

  // Old category string -> new categoryId
  const CATEGORY_MAP = {
    "🍳 Kitchen": "kitchen",
    "🛋️ Living Room": "living_room",
    "🛏️ Bedroom": "bedroom",
    "🛁 Bathroom": "bathroom",
    "🪑 Furniture": "furniture",
    "🔌 Appliances": "appliances",
    "🖼️ Decor": "decor",
    "📦 Other": "other",
    // pre-emoji items from before the icon update
    "Kitchen": "kitchen",
    "Living Room": "living_room",
    "Bedroom": "bedroom",
    "Bathroom": "bathroom",
    "Furniture": "furniture",
    "Appliances": "appliances",
    "Decor": "decor",
    "Other": "other"
  };

  // Old "addedBy" (email prefix string) -> real UID
  // Fill in with your two actual UIDs before running.
  const ADDED_BY_MAP = {
    "fazafizo": "GfyAZxN4OTVebzvrepfHPOkRmVM2",
    "batoot": "lczxFSvLkQOZcYfQGIgDuyw6XEG2"
  };

  const oldSnap = await getDocs(collection(db, "items"));
  console.log(`Found ${oldSnap.size} items in old collection.`);

  let migrated = 0;
  let skipped = [];

  for (const oldDoc of oldSnap.docs) {
    const data = oldDoc.data();

    const categoryId = CATEGORY_MAP[data.category] || "other";
    if (!CATEGORY_MAP[data.category]) {
      skipped.push({ id: oldDoc.id, reason: `unmapped category: "${data.category}"` });
    }

    const addedByUid = ADDED_BY_MAP[data.addedBy] || null;
    if (!addedByUid) {
      skipped.push({ id: oldDoc.id, reason: `unmapped addedBy: "${data.addedBy}"` });
    }

    const priority = data.priority === "Must-have" ? "must"
                    : data.priority === "Nice-to-have" ? "nice"
                    : "must";

    const newItem = {
      name: data.name || "",
      categoryId,
      priority,
      price: typeof data.price === "number" ? data.price : 0,
      quantity: typeof data.qty === "number" ? data.qty : 1,
      link: data.link || "",
      notes: data.notes || "",
      photoURL: data.photoURL || "",
      status: data.status === "bought" ? "bought" : "needed",
      addedBy: addedByUid || "unknown",
      claimedBy: null,
      purchasedBy: data.status === "bought" ? (addedByUid || null) : null,
      createdAt: data.createdAt || null,
      updatedAt: data.createdAt || null,
      purchasedAt: data.status === "bought" ? (data.createdAt || null) : null
    };

    await setDoc(doc(db, "households", HOUSEHOLD_ID, "items", oldDoc.id), newItem);
    migrated++;
  }

  console.log(`Migrated ${migrated} of ${oldSnap.size} items.`);
  if (skipped.length) {
    console.warn("Items with unmapped fields (still migrated, but check these manually):");
    console.table(skipped);
  } else {
    console.log("No unmapped fields — clean migration.");
  }
})();
