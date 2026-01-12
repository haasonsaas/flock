/**
 * Flock Storage Layer
 * IndexedDB wrapper for local-first contact management
 */

const DB_NAME = 'flock-crm';
const DB_VERSION = 1;

class FlockStorage {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactsStore = db.createObjectStore('contacts', { keyPath: 'username' });
          contactsStore.createIndex('list', 'list', { unique: false });
          contactsStore.createIndex('pipelineStage', 'pipelineStage', { unique: false });
          contactsStore.createIndex('createdAt', 'createdAt', { unique: false });
          contactsStore.createIndex('lastInteraction', 'lastInteraction', { unique: false });
        }

        // Lists store
        if (!db.objectStoreNames.contains('lists')) {
          const listsStore = db.createObjectStore('lists', { keyPath: 'id' });
          listsStore.createIndex('name', 'name', { unique: true });
        }

        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagsStore.createIndex('name', 'name', { unique: true });
        }

        // Interactions store
        if (!db.objectStoreNames.contains('interactions')) {
          const interactionsStore = db.createObjectStore('interactions', { keyPath: 'id' });
          interactionsStore.createIndex('contactUsername', 'contactUsername', { unique: false });
          interactionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          interactionsStore.createIndex('type', 'type', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async ensureReady() {
    await this.ready;
  }

  // ===================
  // CONTACTS
  // ===================

  async saveContact(contact) {
    await this.ensureReady();
    const enrichedContact = {
      ...contact,
      createdAt: contact.createdAt || Date.now(),
      updatedAt: Date.now(),
      pipelineStage: contact.pipelineStage || 'new',
      tags: contact.tags || [],
      notes: contact.notes || '',
      list: contact.list || 'default',
      lastInteraction: contact.lastInteraction || null,
      nextFollowUp: contact.nextFollowUp || null,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readwrite');
      const store = tx.objectStore('contacts');
      const request = store.put(enrichedContact);
      request.onsuccess = () => resolve(enrichedContact);
      request.onerror = () => reject(request.error);
    });
  }

  async getContact(username) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const request = store.get(username);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllContacts() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getContactsByList(listId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const index = store.index('list');
      const request = index.getAll(listId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getContactsByPipelineStage(stage) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const index = store.index('pipelineStage');
      const request = index.getAll(stage);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteContact(username) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('contacts', 'readwrite');
      const store = tx.objectStore('contacts');
      const request = store.delete(username);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateContact(username, updates) {
    const existing = await this.getContact(username);
    if (!existing) throw new Error(`Contact ${username} not found`);
    return this.saveContact({ ...existing, ...updates });
  }

  async searchContacts(query) {
    const all = await this.getAllContacts();
    const q = query.toLowerCase();
    return all.filter(c =>
      c.username.toLowerCase().includes(q) ||
      c.displayName?.toLowerCase().includes(q) ||
      c.bio?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  // ===================
  // LISTS
  // ===================

  async createList(name, color = '#F59E0B') {
    await this.ensureReady();
    const list = {
      id: `list_${Date.now()}`,
      name,
      color,
      createdAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('lists', 'readwrite');
      const store = tx.objectStore('lists');
      const request = store.put(list);
      request.onsuccess = () => resolve(list);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLists() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('lists', 'readonly');
      const store = tx.objectStore('lists');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteList(listId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('lists', 'readwrite');
      const store = tx.objectStore('lists');
      const request = store.delete(listId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===================
  // TAGS
  // ===================

  async createTag(name, color = '#6B7280') {
    await this.ensureReady();
    const tag = {
      id: `tag_${Date.now()}`,
      name,
      color,
      createdAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tags', 'readwrite');
      const store = tx.objectStore('tags');
      const request = store.put(tag);
      request.onsuccess = () => resolve(tag);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTags() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tags', 'readonly');
      const store = tx.objectStore('tags');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===================
  // INTERACTIONS
  // ===================

  async logInteraction(contactUsername, type, content = '', metadata = {}) {
    await this.ensureReady();
    const interaction = {
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactUsername,
      type, // 'note', 'dm', 'reply', 'like', 'retweet', 'mention', 'follow'
      content,
      metadata,
      timestamp: Date.now(),
    };

    // Update contact's lastInteraction
    try {
      await this.updateContact(contactUsername, { lastInteraction: Date.now() });
    } catch (e) {
      // Contact might not exist yet
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('interactions', 'readwrite');
      const store = tx.objectStore('interactions');
      const request = store.put(interaction);
      request.onsuccess = () => resolve(interaction);
      request.onerror = () => reject(request.error);
    });
  }

  async getInteractionsForContact(username) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('interactions', 'readonly');
      const store = tx.objectStore('interactions');
      const index = store.index('contactUsername');
      const request = index.getAll(username);
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteInteraction(interactionId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('interactions', 'readwrite');
      const store = tx.objectStore('interactions');
      const request = store.delete(interactionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===================
  // SETTINGS
  // ===================

  async getSetting(key) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  // ===================
  // STATS
  // ===================

  async getStats() {
    const contacts = await this.getAllContacts();
    const interactions = await this.getAllInteractions();

    const byStage = {};
    const byList = {};

    contacts.forEach(c => {
      byStage[c.pipelineStage] = (byStage[c.pipelineStage] || 0) + 1;
      byList[c.list] = (byList[c.list] || 0) + 1;
    });

    return {
      totalContacts: contacts.length,
      byStage,
      byList,
      totalInteractions: interactions.length,
      recentContacts: contacts
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    };
  }

  async getAllInteractions() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('interactions', 'readonly');
      const store = tx.objectStore('interactions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===================
  // EXPORT / IMPORT
  // ===================

  async exportAll() {
    const contacts = await this.getAllContacts();
    const lists = await this.getAllLists();
    const tags = await this.getAllTags();
    const interactions = await this.getAllInteractions();

    return {
      version: 1,
      exportedAt: Date.now(),
      contacts,
      lists,
      tags,
      interactions,
    };
  }

  async importData(data) {
    if (data.version !== 1) throw new Error('Unsupported export version');

    for (const contact of data.contacts || []) {
      await this.saveContact(contact);
    }
    for (const list of data.lists || []) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('lists', 'readwrite');
        tx.objectStore('lists').put(list);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    for (const tag of data.tags || []) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('tags', 'readwrite');
        tx.objectStore('tags').put(tag);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    for (const interaction of data.interactions || []) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('interactions', 'readwrite');
        tx.objectStore('interactions').put(interaction);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

// Singleton export
const flockStorage = new FlockStorage();
export default flockStorage;
