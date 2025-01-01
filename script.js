  const gridContainer = document.getElementById('grid-container');
  const modeIndicator = document.getElementById('mode-indicator');
  const modeToggleBtn = document.getElementById('mode-toggle');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const rotateBtn = document.getElementById('rotate-btn');
  const gridWrapper = document.getElementById('grid-wrapper');
  
  const settingsButton = document.getElementById('settings-button');
  const settingsModal = document.getElementById('settings-modal');
  const closeModal = document.getElementById('close-modal');
  const saveSettingsBtn = document.getElementById('save-settings');
  
  const gridRowsInput = document.getElementById('grid-rows');
  const gridColsInput = document.getElementById('grid-cols');
  const applyGridSizeBtn = document.getElementById('apply-grid-size');
  
  const dailyResetTimeInput = document.getElementById('daily-reset-time');
  const saveResetTimeBtn = document.getElementById('save-reset-time');
  
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Räume
  const roomsListEl = document.getElementById('rooms-list');
  const createRoomBtn = document.getElementById('create-room-btn');
  const newRoomNameInput = document.getElementById('new-room-name');
  
  // Aktueller Modus: 'interaction' oder 'edit'
  let currentMode = 'interaction';
  
  // Zoom & Rotation
  let currentScale = 1.0;
  let currentRotation = 0;
  
  // Datenstruktur zum Speichern (alles in einem JSON)
  // Wir laden initial aus localStorage oder nehmen Defaults
  let appData = {
    gridRows: 20,
    gridCols: 20,
    dailyResetHour: 2,
    apartmentLayout: [], // [ [true/false], ... ]
    cellStates: [],       // [ [ 'dirty'|'clean' ], ... ]
    rooms: []             // [ {id, name, cells: [ {r, c}, ... ]}, ... ]
  };

  /***********************************************************
   * 2) Aus localStorage laden und initialisieren
   ***********************************************************/
  loadFromLocalStorage();
  // Gittergrößen ins DOM eintragen
  gridRowsInput.value = appData.gridRows;
  gridColsInput.value = appData.gridCols;
  dailyResetTimeInput.value = appData.dailyResetHour;
  
  // Falls arrays nicht belegt, Standard anlegen
  if (!appData.apartmentLayout.length) {
    initDefaultLayout(appData.gridRows, appData.gridCols);
  }

  // Gitter aufbauen
  buildGrid();
  updateTransform();
  scheduleDailyReset();

  /***********************************************************
   * 3) Funktionen für Gitter und Layout
   ***********************************************************/

  function initDefaultLayout(rows, cols) {
    appData.apartmentLayout = Array.from({ length: rows }, () => 
      Array(cols).fill(true)
    );
    appData.cellStates = Array.from({ length: rows }, () => 
      Array(cols).fill('dirty')
    );
  }

  function buildGrid() {
    // CSS-Grid-Einstellungen
    gridContainer.style.gridTemplateRows = `repeat(${appData.gridRows}, 1fr)`;
    gridContainer.style.gridTemplateColumns = `repeat(${appData.gridCols}, 1fr)`;
    
    // Grid leeren
    gridContainer.innerHTML = '';
    
    // Zellen erzeugen
    for (let r = 0; r < appData.gridRows; r++) {
      for (let c = 0; c < appData.gridCols; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        
        // Aktiv oder inaktiv?
        if (!appData.apartmentLayout[r][c]) {
          cell.classList.add('inactive');
          // Keine Click-Events
        } else {
          // dirty oder clean?
          if (appData.cellStates[r][c] === 'clean') {
            cell.classList.add('clean');
          } else {
            cell.classList.add('active');
          }
          
          // Klick-Event - abhängig vom Modus
          cell.addEventListener('click', () => {
            if (currentMode === 'interaction') {
              toggleCellState(r, c, cell);
            } else {
              toggleLayout(r, c, cell);
            }
          });
        }
        
        gridContainer.appendChild(cell);
      }
    }
  }

  // clean <-> dirty
  function toggleCellState(row, col, cellEl) {
    if (appData.cellStates[row][col] === 'dirty') {
      appData.cellStates[row][col] = 'clean';
      cellEl.classList.remove('active');
      cellEl.classList.add('clean');
    } else {
      appData.cellStates[row][col] = 'dirty';
      cellEl.classList.remove('clean');
      cellEl.classList.add('active');
    }
  }

  // aktiv/inaktiv schalten
  function toggleLayout(row, col, cellEl) {
    appData.apartmentLayout[row][col] = !appData.apartmentLayout[row][col];
    if (appData.apartmentLayout[row][col]) {
      // reaktiviert -> default dirty
      appData.cellStates[row][col] = 'dirty';
      cellEl.className = 'cell active';
    } else {
      cellEl.className = 'cell inactive';
    }
  }

  /***********************************************************
   * 4) Modus-Umschaltung
   ***********************************************************/
  modeToggleBtn.addEventListener('click', () => {
    if (currentMode === 'interaction') {
      currentMode = 'edit';
      modeToggleBtn.textContent = 'Modus: Bearbeiten';
      modeIndicator.textContent = 'Bearbeitungsmodus';
    } else {
      currentMode = 'interaction';
      modeToggleBtn.textContent = 'Modus: Interaktion';
      modeIndicator.textContent = 'Interaktionsmodus';
    }
  });

  /***********************************************************
   * 5) Zoom & Rotation
   ***********************************************************/
  zoomInBtn.addEventListener('click', () => {
    currentScale += 0.1;
    updateTransform();
  });
  zoomOutBtn.addEventListener('click', () => {
    currentScale = Math.max(0.1, currentScale - 0.1);
    updateTransform();
  });
  rotateBtn.addEventListener('click', () => {
    currentRotation = (currentRotation + 90) % 360;
    updateTransform();
  });

  function updateTransform() {
    gridWrapper.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`;
  }

  /***********************************************************
   * 6) Modal & Einstellungen
   ***********************************************************/
  settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    // Zeige standardmäßig den "Gitter"-Tab
    openTab('gridTab');
  });
  closeModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });
  
  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      openTab(btn.dataset.tab);
    });
  });

  function openTab(tabId) {
    tabContents.forEach(tc => {
      if (tc.id === tabId) tc.classList.add('active');
      else tc.classList.remove('active');
    });
  }

  // Gitter-Größe anwenden
  applyGridSizeBtn.addEventListener('click', () => {
    const newRows = parseInt(gridRowsInput.value, 10);
    const newCols = parseInt(gridColsInput.value, 10);
    if (isNaN(newRows) || newRows < 1 || newRows > 50) {
      alert('Ungültige Zeilenzahl (1-50).');
      return;
    }
    if (isNaN(newCols) || newCols < 1 || newCols > 50) {
      alert('Ungültige Spaltenzahl (1-50).');
      return;
    }
    // Nur wenn sich tatsächlich was ändert
    if (newRows !== appData.gridRows || newCols !== appData.gridCols) {
      appData.gridRows = newRows;
      appData.gridCols = newCols;
      initDefaultLayout(newRows, newCols);
      buildGrid();
    }
  });

  // Täglichen Reset speichern
  saveResetTimeBtn.addEventListener('click', () => {
    const hour = parseInt(dailyResetTimeInput.value, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      alert('Bitte eine Stunde zwischen 0 und 23 angeben.');
      return;
    }
    appData.dailyResetHour = hour;
    alert('Tägliche Reset-Zeit gespeichert: ' + hour + ':00 Uhr');
  });

  // "Einstellungen speichern" (und Modal schließen)
  saveSettingsBtn.addEventListener('click', () => {
    saveToLocalStorage();
    settingsModal.style.display = 'none';
  });

  /***********************************************************
   * 7) Räume erstellen und verwalten
   ***********************************************************/
  createRoomBtn.addEventListener('click', () => {
    const name = newRoomNameInput.value.trim();
    if (!name) {
      alert('Bitte einen Raumnamen eingeben.');
      return;
    }
    // Erstelle Liste aller Zellen, die z. Zt. "aktiv" sind
    // und vom Benutzer "dirty" belassen wurden. 
    // => An dieser Stelle könntest du auch ein "Auswahl-Flag"
    //    definieren. Hier nutzen wir 'dirty' als Beispiel.
    let selectedCells = [];
    for (let r = 0; r < appData.gridRows; r++) {
      for (let c = 0; c < appData.gridCols; c++) {
        if (appData.apartmentLayout[r][c] && appData.cellStates[r][c] === 'dirty') {
          // Du könntest alternativ eine weitere Hilfs-Variable 
          // "selected" einführen, um nicht 'dirty' zu zweckentfremden.
          selectedCells.push({r, c});
        }
      }
    }
    if (selectedCells.length === 0) {
      alert('Keine aktiven Zellen (dirty) zum Raum hinzugefügt.');
      return;
    }
    
    const newRoom = {
      id: Date.now(), // einfache ID
      name,
      cells: selectedCells
    };
    appData.rooms.push(newRoom);
    newRoomNameInput.value = '';
    
    renderRoomsList();
    alert(`Raum "${name}" erstellt!`);
  });

  function renderRoomsList() {
    roomsListEl.innerHTML = '';
    if (!appData.rooms.length) {
      roomsListEl.innerHTML = '<p>Keine Räume definiert.</p>';
      return;
    }
    appData.rooms.forEach(room => {
      const div = document.createElement('div');
      div.classList.add('room-item');
      
      const label = document.createElement('span');
      label.textContent = room.name;
      
      const btnContainer = document.createElement('span');
      
      // Button "Highlight"
      const highlightBtn = document.createElement('button');
      highlightBtn.textContent = 'Markieren';
      highlightBtn.addEventListener('click', () => {
        highlightRoom(room);
      });
      
      // Button "Löschen"
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Löschen';
      deleteBtn.addEventListener('click', () => {
        deleteRoom(room.id);
      });
      
      btnContainer.appendChild(highlightBtn);
      btnContainer.appendChild(deleteBtn);
      
      div.appendChild(label);
      div.appendChild(btnContainer);
      roomsListEl.appendChild(div);
    });
  }

  // Raum hervorheben
  function highlightRoom(room) {
    // Wir können die Zellen in irgendeiner Farbe 
    // oder z. B. "blinkend" hervorheben.
    // Hier machen wir nur ein einfaches "scroll to" + 
    //  kurz "gelb blinken" (als Beispiel).
    
    // Baue eine "Set" aller Koordinaten
    const coordsSet = new Set(room.cells.map(c => `${c.r},${c.c}`));
    
    // Iteriere über alle Grid-Kinder
    [...gridContainer.children].forEach((cellEl, index) => {
      const r = Math.floor(index / appData.gridCols);
      const c = index % appData.gridCols;
      if (coordsSet.has(`${r},${c}`)) {
        cellEl.style.transition = 'background-color 0.5s';
        cellEl.style.backgroundColor = 'yellow';
        // Nach 1 Sek wiederherstellen
        setTimeout(() => {
          if (!appData.apartmentLayout[r][c]) {
            cellEl.className = 'cell inactive';
          } else {
            // dirty or clean?
            cellEl.className = 'cell ' + 
              (appData.cellStates[r][c] === 'clean' ? 'clean' : 'active');
          }
        }, 1000);
      }
    });
  }

  // Raum löschen
  function deleteRoom(roomId) {
    appData.rooms = appData.rooms.filter(r => r.id !== roomId);
    renderRoomsList();
  }

  // Initial einmal Liste rendern
  renderRoomsList();

  /***********************************************************
   * 8) Tägliches Zurücksetzen
   ***********************************************************/
  function scheduleDailyReset() {
    const now = new Date();
    const nextReset = new Date();
    nextReset.setHours(appData.dailyResetHour, 0, 0, 0);
    
    if (now >= nextReset) {
      // Morgen
      nextReset.setDate(nextReset.getDate() + 1);
    }
    const diff = nextReset - now;
    setTimeout(() => {
      resetAllCells();
      scheduleDailyReset(); // Danach neu ansetzen
    }, diff);
  }

  // Reset-Funktion
  function resetAllCells() {
    for (let r = 0; r < appData.gridRows; r++) {
      for (let c = 0; c < appData.gridCols; c++) {
        if (appData.apartmentLayout[r][c]) {
          appData.cellStates[r][c] = 'dirty';
        }
      }
    }
    buildGrid();
    saveToLocalStorage();
    console.log('Täglicher Reset ausgeführt.');
  }

  /***********************************************************
   * 9) Lokale Speicherung
   ***********************************************************/
  function loadFromLocalStorage() {
    const saved = localStorage.getItem('navigoOrdnungData');
    if (saved) {
      try {
        appData = JSON.parse(saved);
      } catch (err) {
        console.warn('Fehler beim Laden aus localStorage, verwende Defaults:', err);
      }
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem('navigoOrdnungData', JSON.stringify(appData));
  }

});
