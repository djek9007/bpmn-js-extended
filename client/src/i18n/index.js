const FALLBACK_LOCALE = 'en';
const LANGUAGE_STORAGE_KEY = 'bpmn-language-preference';

const messages = {
  en: {
    language: {
      label: 'Language',
      options: {
        en: 'English',
        de: 'Deutsch',
        ru: 'Русский'
      }
    },
    app: {
      modelerTitle: 'BPMN Modeler',
      viewerTitle: 'BPMN Viewer'
    },
    diagram: {
      untitled: 'Untitled diagram',
      unsaved: 'Unsaved diagram'
    },
    actions: {
      validateProcess: {
        label: 'Validate',
        ariaLabel: 'Validate the process diagram',
        title: 'Validate the process diagram for errors'
      },
      newDiagram: {
        label: 'New diagram',
        ariaLabel: 'Create a new diagram',
        title: 'Create a new diagram (Ctrl/Cmd+N)'
      },
      importFile: {
        label: 'Import file',
        ariaLabel: 'Import a BPMN file',
        title: 'Import a BPMN file (Ctrl/Cmd+O)'
      },
      downloadDiagram: {
        label: 'Download diagram',
        ariaLabel: 'Download the current BPMN diagram',
        title: 'Download the current BPMN diagram'
      },
      exportSvg: {
        label: 'Export as SVG',
        ariaLabel: 'Export the diagram as an SVG image',
        title: 'Export the diagram as an SVG image'
      },
      exportPng: {
        label: 'Export as PNG',
        ariaLabel: 'Export the diagram as a PNG image',
        title: 'Export the diagram as a PNG image'
      },
      editXml: {
        label: 'Edit XML',
        ariaLabel: 'Open the XML source editor',
        title: 'Open the XML source editor'
      },
      saveDiagram: {
        label: 'Save diagram',
        ariaLabel: 'Save the current diagram to storage',
        ariaLabelUnsaved: 'Choose where to save the current diagram',
        title: 'Save the current diagram to storage (Ctrl/Cmd+S, Ctrl/Cmd+Shift+S for Save As)',
        titleUnsaved: 'Choose where to save the current diagram (Ctrl/Cmd+S)'
      },
      shareDiagram: {
        label: 'Share diagram',
        ariaLabel: 'Share the current diagram as a viewer link',
        title: 'Share the current diagram as a viewer link'
      },
      moreActions: {
        label: 'More actions',
        open: 'Show additional actions',
        close: 'Hide additional actions'
      },
      openStorage: {
        label: 'Open storage',
        ariaLabel: 'Open workspace storage',
        title: 'Open workspace storage (Ctrl/Cmd+Shift+O)'
      },
      fillColor: {
        label: 'Fill color',
        ariaLabel: 'Fill color of selected element',
        title: 'Fill color of selected element'
      },
      undo: {
        label: 'Undo',
        ariaLabel: 'Undo last action',
        title: 'Undo last action (Ctrl/Cmd+Z)'
      },
      redo: {
        label: 'Redo',
        ariaLabel: 'Redo last undone action',
        title: 'Redo last undone action (Ctrl/Cmd+Y)'
      },
      delete: {
        label: 'Delete',
        ariaLabel: 'Delete selected elements',
        title: 'Delete selected elements (Delete/Backspace)'
      },
      deleteFile: {
        label: 'Delete file',
        ariaLabel: 'Delete file',
        title: 'Delete file'
      },
      renameFile: {
        label: 'Rename file',
        ariaLabel: 'Rename file',
        title: 'Rename file'
      }
    },
    fillColor: {
      label: 'Fill Color'
    },
    theme: {
      srLabel: 'Toggle theme',
      activateDark: 'Activate dark mode',
      activateLight: 'Activate light mode',
      switchToDark: 'Switch to dark mode',
      switchToLight: 'Switch to light mode',
      followSystemHint: 'Shift + click to follow system theme',
      menuLabel: 'Theme'
    },
    storage: {
      title: 'Workspace Storage',
      close: 'Close',
      saveHeading: 'Save Diagram',
      saveHint: 'Enter a path relative to the diagrams folder. Create folders as needed.',
      savePathLabel: 'File path',
      savePlaceholder: 'orders/process.bpmn',
      saveButton: 'Save',
      createHeading: 'Create Folder',
      folderPathLabel: 'Folder path',
      folderPlaceholder: 'orders/new-folder',
      createButton: 'Create',
      empty: 'Storage is empty.',
      failed: 'Failed to load storage.'
    },
    share: {
      dialogTitle: 'Share diagram',
      dialogDescription: "Choose how you'd like to share this diagram.",
      optionsLegend: 'Share options',
      sourceTitle: 'Share saved source file',
      sourceHint: 'Generate a link to the file stored in workspace storage.',
      snapshotTitle: 'Create snapshot copy',
      snapshotHint: 'Save a timestamped copy in <code>shared/</code> and share that link.',
      linkLabel: 'Share link',
      copyLink: 'Copy link',
      cancel: 'Cancel',
      generate: 'Generate link',
      copied: 'Copied!',
      error: {
        noSource: 'Save the diagram before sharing the source file.',
        generic: 'Unable to generate a share link. Please try again.',
        clipboardUnsupported: 'Copy to clipboard is not supported in this browser.'
      },
      alertUnsupported: 'Sharing is not supported in this browser.'
    },
    xmlEditor: {
      title: 'Edit XML',
      description: 'Make changes to the BPMN XML. Invalid XML cannot be imported.',
      label: 'Diagram XML',
      apply: 'Apply changes',
      cancel: 'Cancel',
      loadError: 'Unable to load the XML source. Please try again.',
      importError: 'The XML is invalid. Please fix the issues and try again.'
    },
    zoom: {
      groupLabel: 'Zoom controls',
      in: 'Zoom in',
      fit: 'Fit to screen',
      out: 'Zoom out'
    },
    prompts: {
      provideFilePath: 'Provide a file path to save the diagram.',
      provideFolderPath: 'Provide a folder path.',
      confirmDeleteFile: 'Are you sure you want to delete file "{name}"?',
      renameFile: 'Enter a new name for the file "{name}":'
    },
    notifications: {
      newDiagramFailed: 'Failed to create a new diagram. Check the console for details.',
      importFailed: 'Failed to import the selected file.',
      downloadFailed: 'Failed to download the BPMN diagram.',
      exportFailed: 'Failed to export the diagram.',
      loadFromStorageFailed: 'Unable to load the BPMN file from storage.',
      saveSuccess: 'Diagram saved to storage.',
      saveFailed: 'Unable to save the BPMN file.',
      folderCreated: 'Folder created.',
      folderCreateFailed: 'Unable to create the folder.',
      fileDeleted: 'File deleted.',
      fileDeleteFailed: 'Unable to delete the file.',
      fileRenamed: 'File renamed.',
      renameFailed: 'Unable to rename the file.'
    },
    autoSave: {
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Save failed'
    },
    processCheck: {
      valid: '✓ Process is valid — all paths reach an End Event.',
      issuesFound: 'Found {count} issue(s):',
      clear: 'Clear',
      issues: {
        NO_DEFINITIONS: 'No BPMN definitions found in the diagram.',
        NO_PROCESS: 'No <bpmn:Process> found in the diagram.',
        NO_START_EVENT: 'No Start Event found. The process needs at least one Start Event.',
        NO_END_EVENT: 'No End Event found. The process needs at least one End Event.',
        START_HAS_INCOMING: '«{name}» has incoming sequence flow — Start Events should only have outgoing flows.',
        START_NO_OUTGOING: '«{name}» has no outgoing sequence flow — the process starts but goes nowhere.',
        END_NO_INCOMING: '«{name}» has no incoming sequence flow — nothing reaches it.',
        END_HAS_OUTGOING: '«{name}» has outgoing sequence flow — End Events should be terminal.',
        TASK_NO_INCOMING: '«{name}» has no incoming sequence flow — nothing triggers it.',
        TASK_NO_OUTGOING: '«{name}» has no outgoing sequence flow — the process stops here.',
        GATEWAY_NO_INCOMING: '«{name}» has no incoming sequence flow.',
        GATEWAY_NO_OUTGOING: '«{name}» has no outgoing sequence flow — paths end at this gateway.',
        UNREACHABLE: '«{name}» is not reachable from any Start Event.',
        DEAD_END: '«{name}» is a dead end — sequence flow stops here without reaching an End Event.',
        AND_GATEWAY_HINT: '«{name}» (Parallel Gateway) — odd number of AND gateways. Each AND fork should have a matching AND join.'
      }
    },
    viewer: {
      missingPath: 'No diagram path provided. Append ?path=orders/process.bpmn to the URL (paths are relative to the diagrams folder).',
      loadError: 'Unable to load diagram. Check the path and try again.'
    }
  },
  de: {
    language: {
      label: 'Sprache',
      options: {
        en: 'Englisch',
        de: 'Deutsch',
        ru: 'Russisch'
      }
    },
    app: {
      modelerTitle: 'BPMN-Modeler',
      viewerTitle: 'BPMN-Viewer'
    },
    diagram: {
      untitled: 'Unbenanntes Diagramm',
      unsaved: 'Nicht gespeichertes Diagramm'
    },
    actions: {
      validateProcess: {
        label: 'Prüfen',
        ariaLabel: 'Das Prozessdiagramm prüfen',
        title: 'Das Prozessdiagramm auf Fehler prüfen'
      },
      newDiagram: {
        label: 'Neues Diagramm',
        ariaLabel: 'Ein neues Diagramm erstellen',
        title: 'Ein neues Diagramm erstellen (Strg/Befehl+N)'
      },
      importFile: {
        label: 'Importieren',
        ariaLabel: 'Eine BPMN-Datei importieren',
        title: 'Eine BPMN-Datei importieren (Strg/Befehl+O)'
      },
      downloadDiagram: {
        label: 'Herunterladen',
        ariaLabel: 'Das aktuelle BPMN-Diagramm herunterladen',
        title: 'Das aktuelle BPMN-Diagramm herunterladen'
      },
      exportSvg: {
        label: 'Als SVG exportieren',
        ariaLabel: 'Das Diagramm als SVG-Bild exportieren',
        title: 'Das Diagramm als SVG-Bild exportieren'
      },
      exportPng: {
        label: 'Als PNG exportieren',
        ariaLabel: 'Das Diagramm als PNG-Bild exportieren',
        title: 'Das Diagramm als PNG-Bild exportieren'
      },
      editXml: {
        label: 'XML bearbeiten',
        ariaLabel: 'XML-Quelltext-Editor öffnen',
        title: 'XML-Quelltext-Editor öffnen'
      },
      saveDiagram: {
        label: 'Speichern',
        ariaLabel: 'Das aktuelle Diagramm im Speicher sichern',
        ariaLabelUnsaved: 'Speicherort zum Speichern des Diagramms auswählen',
        title: 'Das aktuelle Diagramm im Speicher sichern (Strg/Befehl+S, Strg/Befehl+Umschalt+S für Speichern unter)',
        titleUnsaved: 'Speicherort zum Speichern des Diagramms auswählen (Strg/Befehl+S)'
      },
      shareDiagram: {
        label: 'Diagramm teilen',
        ariaLabel: 'Das aktuelle Diagramm als Viewer-Link teilen',
        title: 'Das aktuelle Diagramm als Viewer-Link teilen'
      },
      moreActions: {
        label: 'Weitere Aktionen',
        open: 'Zusätzliche Aktionen anzeigen',
        close: 'Zusätzliche Aktionen verbergen'
      },
      openStorage: {
        label: 'Speicher öffnen',
        ariaLabel: 'Arbeitsbereichsspeicher öffnen',
        title: 'Arbeitsbereichsspeicher öffnen (Strg/Befehl+Umschalt+O)'
      },
      fillColor: {
        label: 'Füllfarbe',
        ariaLabel: 'Füllfarbe des ausgewählten Elements',
        title: 'Füllfarbe des ausgewählten Elements'
      },
      undo: {
        label: 'Rückgängig',
        ariaLabel: 'Letzte Aktion rückgängig machen',
        title: 'Letzte Aktion rückgängig machen (Strg/Befehl+Z)'
      },
      redo: {
        label: 'Wiederholen',
        ariaLabel: 'Letzte rückgängig gemachte Aktion wiederherstellen',
        title: 'Letzte rückgängig gemachte Aktion wiederherstellen (Strg/Befehl+Y)'
      },
      delete: {
        label: 'Löschen',
        ariaLabel: 'Ausgewählte Elemente löschen',
        title: 'Ausgewählte Elemente löschen (Entf/Rücktaste)'
      },
      deleteFile: {
        label: 'Datei löschen',
        ariaLabel: 'Datei löschen',
        title: 'Datei löschen'
      },
      renameFile: {
        label: 'Datei umbenennen',
        ariaLabel: 'Datei umbenennen',
        title: 'Datei umbenennen'
      }
    },
    fillColor: {
      label: 'Füllfarbe'
    },
    theme: {
      srLabel: 'Theme umschalten',
      activateDark: 'Dunkelmodus aktivieren',
      activateLight: 'Hellmodus aktivieren',
      switchToDark: 'Zum Dunkelmodus wechseln',
      switchToLight: 'Zum Hellmodus wechseln',
      followSystemHint: 'Shift + Klick, um dem Systemthema zu folgen',
      menuLabel: 'Design'
    },
    storage: {
      title: 'Arbeitsbereichsspeicher',
      close: 'Schließen',
      saveHeading: 'Diagramm speichern',
      saveHint: 'Geben Sie einen Pfad relativ zum Ordner „diagrams“ an. Erstellen Sie bei Bedarf Ordner.',
      savePathLabel: 'Dateipfad',
      savePlaceholder: 'ablage/prozess.bpmn',
      saveButton: 'Speichern',
      createHeading: 'Ordner erstellen',
      folderPathLabel: 'Ordnerpfad',
      folderPlaceholder: 'ablage/neuer-ordner',
      createButton: 'Erstellen',
      empty: 'Der Speicher ist leer.',
      failed: 'Speicher konnte nicht geladen werden.'
    },
    share: {
      dialogTitle: 'Diagramm teilen',
      dialogDescription: 'Wählen Sie aus, wie Sie dieses Diagramm teilen möchten.',
      optionsLegend: 'Teiloptionen',
      sourceTitle: 'Gespeicherte Quelldatei teilen',
      sourceHint: 'Einen Link zur im Arbeitsbereich gespeicherten Datei erzeugen.',
      snapshotTitle: 'Schnappschusskopie erstellen',
      snapshotHint: 'Eine Version mit Zeitstempel in <code>shared/</code> speichern und diesen Link teilen.',
      linkLabel: 'Teil-Link',
      copyLink: 'Link kopieren',
      cancel: 'Abbrechen',
      generate: 'Link erzeugen',
      copied: 'Kopiert!',
      error: {
        noSource: 'Speichern Sie das Diagramm, bevor Sie die Quelldatei teilen.',
        generic: 'Teil-Link konnte nicht erzeugt werden. Bitte erneut versuchen.',
        clipboardUnsupported: 'Zwischenablage wird in diesem Browser nicht unterstützt.'
      },
      alertUnsupported: 'Teilen wird in diesem Browser nicht unterstützt.'
    },
    xmlEditor: {
      title: 'XML bearbeiten',
      description: 'Bearbeiten Sie den BPMN-XML-Quelltext. Ungültiges XML kann nicht importiert werden.',
      label: 'Diagramm-XML',
      apply: 'Änderungen anwenden',
      cancel: 'Abbrechen',
      loadError: 'XML-Quelltext konnte nicht geladen werden. Bitte erneut versuchen.',
      importError: 'Das XML ist ungültig. Bitte korrigieren und erneut versuchen.'
    },
    zoom: {
      groupLabel: 'Zoomsteuerung',
      in: 'Heranzoomen',
      fit: 'An Bildschirm anpassen',
      out: 'Herauszoomen'
    },
    prompts: {
      provideFilePath: 'Geben Sie einen Dateipfad zum Speichern des Diagramms an.',
      provideFolderPath: 'Geben Sie einen Ordnerpfad an.',
      confirmDeleteFile: 'Möchten Sie die Datei „{name}“ wirklich löschen?',
      renameFile: 'Geben Sie einen neuen Namen für die Datei „{name}“ ein:'
    },
    notifications: {
      newDiagramFailed: 'Neues Diagramm konnte nicht erstellt werden. Details siehe Konsole.',
      importFailed: 'Ausgewählte Datei konnte nicht importiert werden.',
      downloadFailed: 'BPMN-Diagramm konnte nicht heruntergeladen werden.',
      exportFailed: 'Diagramm konnte nicht exportiert werden.',
      loadFromStorageFailed: 'BPMN-Datei konnte nicht aus dem Speicher geladen werden.',
      saveSuccess: 'Diagramm im Speicher abgelegt.',
      saveFailed: 'BPMN-Datei konnte nicht gespeichert werden.',
      folderCreated: 'Ordner erstellt.',
      folderCreateFailed: 'Ordner konnte nicht erstellt werden.',
      fileDeleted: 'Datei gelöscht.',
      fileDeleteFailed: 'Datei konnte nicht gelöscht werden.',
      fileRenamed: 'Datei umbenannt.',
      renameFailed: 'Datei konnte nicht umbenannt werden.'
    },
    processCheck: {
      valid: '✓ Prozess ist gültig — alle Pfade erreichen ein End-Ereignis.',
      issuesFound: '{count} Problem(e) gefunden:',
      clear: 'Zurücksetzen',
      issues: {
        NO_DEFINITIONS: 'Keine BPMN-Definitionen im Diagramm gefunden.',
        NO_PROCESS: 'Kein <bpmn:Process> im Diagramm gefunden.',
        NO_START_EVENT: 'Kein Startereignis gefunden. Der Prozess benötigt mindestens ein Startereignis.',
        NO_END_EVENT: 'Kein Endereignis gefunden. Der Prozess benötigt mindestens ein Endereignis.',
        START_HAS_INCOMING: '«{name}» hat eingehenden Sequenzfluss — Startereignisse sollten nur ausgehende Flüsse haben.',
        START_NO_OUTGOING: '«{name}» hat keinen ausgehenden Sequenzfluss — der Prozess beginnt, geht aber nirgendwo hin.',
        END_NO_INCOMING: '«{name}» hat keinen eingehenden Sequenzfluss — nichts erreicht es.',
        END_HAS_OUTGOING: '«{name}» hat ausgehenden Sequenzfluss — Endereignisse sollten terminal sein.',
        TASK_NO_INCOMING: '«{name}» hat keinen eingehenden Sequenzfluss — nichts löst es aus.',
        TASK_NO_OUTGOING: '«{name}» hat keinen ausgehenden Sequenzfluss — der Prozess stoppt hier.',
        GATEWAY_NO_INCOMING: '«{name}» hat keinen eingehenden Sequenzfluss.',
        GATEWAY_NO_OUTGOING: '«{name}» hat keinen ausgehenden Sequenzfluss — Pfade enden an diesem Gateway.',
        UNREACHABLE: '«{name}» ist von keinem Startereignis erreichbar.',
        DEAD_END: '«{name}» ist eine Sackgasse — der Sequenzfluss endet hier ohne ein Endereignis zu erreichen.',
        AND_GATEWAY_HINT: '«{name}» (Parallel-Gateway) — ungerade Anzahl von AND-Gateways. Jede AND-Verzweigung benötigt eine passende AND-Zusammenführung.'
      }
    },
    autoSave: {
      saving: 'Speichern...',
      saved: 'Gespeichert',
      error: 'Fehler'
    },
    viewer: {
      missingPath: 'Kein Diagrammpfad angegeben. Hängen Sie ?path=ablage/prozess.bpmn an die URL an (Pfade sind relativ zum Ordner „diagrams“).',
      loadError: 'Diagramm konnte nicht geladen werden. Pfad überprüfen und erneut versuchen.'
    }
  },
  ru: {
    language: {
      label: 'Язык',
      options: {
        en: 'English',
        de: 'Deutsch',
        ru: 'Русский'
      }
    },
    app: {
      modelerTitle: 'BPMN-редактор',
      viewerTitle: 'BPMN-просмотрщик'
    },
    diagram: {
      untitled: 'Диаграмма без названия',
      unsaved: 'Несохранённая диаграмма'
    },
    actions: {
      validateProcess: {
        label: 'Проверка',
        ariaLabel: 'Проверить диаграмму процесса на ошибки',
        title: 'Проверить диаграмму процесса на ошибки'
      },
      newDiagram: {
        label: 'Создать',
        ariaLabel: 'Создать новую диаграмму',
        title: 'Создать новую диаграмму (Ctrl/Cmd+N)'
      },
      importFile: {
        label: 'Импорт',
        ariaLabel: 'Импортировать BPMN-файл',
        title: 'Импортировать BPMN-файл (Ctrl/Cmd+O)'
      },
      downloadDiagram: {
        label: 'Скачать',
        ariaLabel: 'Скачать текущую BPMN-диаграмму',
        title: 'Скачать текущую BPMN-диаграмму'
      },
      exportSvg: {
        label: 'Экспорт в SVG',
        ariaLabel: 'Экспортировать диаграмму в SVG',
        title: 'Экспортировать диаграмму в SVG'
      },
      exportPng: {
        label: 'Экспорт в PNG',
        ariaLabel: 'Экспортировать диаграмму в PNG',
        title: 'Экспортировать диаграмму в PNG'
      },
      editXml: {
        label: 'XML',
        ariaLabel: 'Открыть редактор XML',
        title: 'Открыть редактор XML'
      },
      saveDiagram: {
        label: 'Сохранить',
        ariaLabel: 'Сохранить диаграмму',
        ariaLabelUnsaved: 'Выберите, куда сохранить диаграмму',
        title: 'Сохранить диаграмму (Ctrl/Cmd+S, Ctrl/Cmd+Shift+S — сохранить как)',
        titleUnsaved: 'Выберите, куда сохранить диаграмму (Ctrl/Cmd+S)'
      },
      shareDiagram: {
        label: 'Поделиться',
        ariaLabel: 'Поделиться ссылкой на диаграмму',
        title: 'Поделиться ссылкой на диаграмму'
      },
      moreActions: {
        label: 'Ещё',
        open: 'Показать дополнительные действия',
        close: 'Скрыть дополнительные действия'
      },
      openStorage: {
        label: 'Файлы',
        ariaLabel: 'Открыть хранилище',
        title: 'Открыть хранилище (Ctrl/Cmd+Shift+O)'
      },
      fillColor: {
        label: 'Цвет',
        ariaLabel: 'Заливка цветом выбранного элемента',
        title: 'Заливка цветом выбранного элемента'
      },
      undo: {
        label: 'Отмена',
        ariaLabel: 'Отменить последнее действие',
        title: 'Отменить последнее действие (Ctrl/Cmd+Z)'
      },
      redo: {
        label: 'Повтор',
        ariaLabel: 'Повторить отменённое действие',
        title: 'Повторить отменённое действие (Ctrl/Cmd+Y)'
      },
      delete: {
        label: 'Удалить',
        ariaLabel: 'Удалить выбранные элементы',
        title: 'Удалить выбранные элементы (Delete/Backspace)'
      },
      deleteFile: {
        label: 'Удалить файл',
        ariaLabel: 'Удалить файл',
        title: 'Удалить файл'
      },
      renameFile: {
        label: 'Переименовать файл',
        ariaLabel: 'Переименовать файл',
        title: 'Переименовать файл'
      }
    },
    fillColor: {
      label: 'Цвет заливки'
    },
    theme: {
      srLabel: 'Переключить тему',
      activateDark: 'Включить тёмную тему',
      activateLight: 'Включить светлую тему',
      switchToDark: 'Переключить на тёмную тему',
      switchToLight: 'Переключить на светлую тему',
      followSystemHint: 'Shift + клик — следовать системной теме',
      menuLabel: 'Тема'
    },
    storage: {
      title: 'Хранилище',
      close: 'Закрыть',
      saveHeading: 'Сохранить диаграмму',
      saveHint: 'Укажите путь относительно папки diagrams. Создавайте папки по необходимости.',
      savePathLabel: 'Путь к файлу',
      savePlaceholder: 'orders/process.bpmn',
      saveButton: 'Сохранить',
      createHeading: 'Создать папку',
      folderPathLabel: 'Путь к папке',
      folderPlaceholder: 'orders/new-folder',
      createButton: 'Создать',
      empty: 'Хранилище пусто.',
      failed: 'Не удалось загрузить хранилище.'
    },
    share: {
      dialogTitle: 'Поделиться диаграммой',
      dialogDescription: 'Выберите способ публикации диаграммы.',
      optionsLegend: 'Способ публикации',
      sourceTitle: 'Поделиться сохранённым файлом',
      sourceHint: 'Создать ссылку на файл в хранилище.',
      snapshotTitle: 'Создать копию-снимок',
      snapshotHint: 'Сохранить копию с отметкой времени в <code>shared/</code> и поделиться ссылкой.',
      linkLabel: 'Ссылка',
      copyLink: 'Копировать',
      cancel: 'Отмена',
      generate: 'Создать ссылку',
      copied: 'Скопировано!',
      error: {
        noSource: 'Сохраните диаграмму перед публикацией.',
        generic: 'Не удалось создать ссылку. Попробуйте ещё раз.',
        clipboardUnsupported: 'Браузер не поддерживает копирование в буфер обмена.'
      },
      alertUnsupported: 'Публикация не поддерживается в этом браузере.'
    },
    xmlEditor: {
      title: 'Редактор XML',
      description: 'Измените BPMN-код. Некорректный XML не будет импортирован.',
      label: 'XML диаграммы',
      apply: 'Применить',
      cancel: 'Отмена',
      loadError: 'Не удалось загрузить XML. Попробуйте ещё раз.',
      importError: 'XML содержит ошибки. Исправьте их и попробуйте снова.'
    },
    zoom: {
      groupLabel: 'Масштаб',
      in: 'Приблизить',
      fit: 'По размеру экрана',
      out: 'Отдалить'
    },
    prompts: {
      provideFilePath: 'Укажите путь для сохранения диаграммы.',
      provideFolderPath: 'Укажите путь к папке.',
      confirmDeleteFile: 'Вы уверены, что хотите удалить файл «{name}»?',
      renameFile: 'Введите новое имя файла «{name}»:'
    },
    notifications: {
      newDiagramFailed: 'Не удалось создать диаграмму. Подробности в консоли.',
      importFailed: 'Не удалось импортировать выбранный файл.',
      downloadFailed: 'Не удалось скачать диаграмму.',
      exportFailed: 'Не удалось экспортировать диаграмму.',
      loadFromStorageFailed: 'Не удалось загрузить BPMN-файл из хранилища.',
      saveSuccess: 'Диаграмма сохранена в хранилище.',
      saveFailed: 'Не удалось сохранить BPMN-файл.',
      folderCreated: 'Папка создана.',
      folderCreateFailed: 'Не удалось создать папку.',
      fileDeleted: 'Файл удалён.',
      fileDeleteFailed: 'Не удалось удалить файл.',
      fileRenamed: 'Файл переименован.',
      renameFailed: 'Не удалось переименовать файл.'
    },
    processCheck: {
      valid: '✓ Процесс корректен — все пути достигают End-события.',
      issuesFound: 'Найдено ошибок: {count}',
      clear: 'Сбросить',
      issues: {
        NO_DEFINITIONS: 'BPMN-определения не найдены в диаграмме.',
        NO_PROCESS: 'BPMN-процесс не найден в диаграмме.',
        NO_START_EVENT: 'Не найден Start Event. Процесс должен содержать хотя бы один Start Event.',
        NO_END_EVENT: 'Не найден End Event. Процесс должен содержать хотя бы один End Event.',
        START_HAS_INCOMING: '«{name}» имеет входящий поток — Start Event должен иметь только исходящие потоки.',
        START_NO_OUTGOING: '«{name}» не имеет исходящего потока — процесс начинается, но никуда не ведёт.',
        END_NO_INCOMING: '«{name}» не имеет входящего потока — ничто не достигает его.',
        END_HAS_OUTGOING: '«{name}» имеет исходящий поток — End Event должен быть терминальным.',
        TASK_NO_INCOMING: '«{name}» не имеет входящего потока — ничто не запускает его.',
        TASK_NO_OUTGOING: '«{name}» не имеет исходящего потока — процесс останавливается здесь.',
        GATEWAY_NO_INCOMING: '«{name}» не имеет входящего потока.',
        GATEWAY_NO_OUTGOING: '«{name}» не имеет исходящего потока — пути заканчиваются на этом gateway.',
        UNREACHABLE: '«{name}» недостижим из Start Event.',
        DEAD_END: '«{name}» — тупик: поток обрывается, не достигнув End Event.',
        AND_GATEWAY_HINT: '«{name}» (Parallel Gateway) — нечётное количество AND-шлюзов. У каждого AND-разветвления должен быть парный AND-схождение.'
      }
    },
    autoSave: {
      saving: 'Сохранение...',
      saved: 'Сохранено',
      error: 'Ошибка'
    },
    viewer: {
      missingPath: 'Путь к диаграмме не указан. Добавьте ?path=orders/process.bpmn к URL.',
      loadError: 'Не удалось загрузить диаграмму. Проверьте путь.'
    }
  }
};

export function overrideAppTitles(titles = {}) {
  const modelerTitle = typeof titles.modeler === 'string' && titles.modeler.trim() ? titles.modeler.trim() : null;
  const viewerTitle = typeof titles.viewer === 'string' && titles.viewer.trim() ? titles.viewer.trim() : null;

  if (!modelerTitle && !viewerTitle) {
    return;
  }

  Object.values(messages).forEach((localeMessages) => {
    if (!localeMessages?.app) {
      return;
    }

    if (modelerTitle) {
      localeMessages.app.modelerTitle = modelerTitle;
    }

    if (viewerTitle) {
      localeMessages.app.viewerTitle = viewerTitle;
    }
  });
}

let currentLocale = FALLBACK_LOCALE;
const listeners = new Set();

function getMessage(locale, key) {
  const segments = key.split('.');
  let value = messages[locale];

  for (const segment of segments) {
    if (value && typeof value === 'object' && segment in value) {
      value = value[segment];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
}

function readStoredLocale() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || undefined;
  } catch (error) {
    console.warn('Unable to read locale from storage.', error);
    return undefined;
  }
}

function persistLocale(locale) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('Unable to persist locale preference.', error);
  }
}

function normalizeLocale(locale) {
  if (locale && locale in messages) {
    return locale;
  }

  return FALLBACK_LOCALE;
}

function detectLocale() {
  const stored = readStoredLocale();

  if (stored && stored in messages) {
    return stored;
  }

  const navigatorLocale = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0]?.toLowerCase() : undefined;

  if (navigatorLocale && navigatorLocale in messages) {
    return navigatorLocale;
  }

  return FALLBACK_LOCALE;
}

function notifyLocaleChange() {
  document.documentElement.setAttribute('lang', currentLocale);
  listeners.forEach((listener) => listener(currentLocale));
}

export function setLocale(locale) {
  const normalized = normalizeLocale(locale);

  if (normalized === currentLocale) {
    document.documentElement.setAttribute('lang', currentLocale);
    return;
  }

  currentLocale = normalized;
  persistLocale(normalized);
  notifyLocaleChange();
}

export function initializeLocale() {
  const initialLocale = detectLocale();
  currentLocale = initialLocale;
  document.documentElement.setAttribute('lang', currentLocale);
  persistLocale(currentLocale);
  notifyLocaleChange();
  return currentLocale;
}

export function t(key, params) {
  let msg = getMessage(currentLocale, key) ?? getMessage(FALLBACK_LOCALE, key) ?? key;
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}

export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentLocale() {
  return currentLocale;
}

export function getAvailableLocales() {
  return Object.keys(messages);
}

export function applyTranslations(root = document) {
  const textElements = root.querySelectorAll('[data-i18n]');
  textElements.forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }

    const translation = t(key);
    if (translation !== undefined) {
      element.textContent = translation;
    }
  });

  const htmlElements = root.querySelectorAll('[data-i18n-html]');
  htmlElements.forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (!key) {
      return;
    }

    const translation = t(key);
    if (translation !== undefined) {
      element.innerHTML = translation;
    }
  });

  const attrElements = root.querySelectorAll('[data-i18n-attrs]');
  attrElements.forEach((element) => {
    const config = element.dataset.i18nAttrs;
    if (!config) {
      return;
    }

    const pairs = config.split(',');

    pairs.forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      if (!attr || !key) {
        return;
      }

      const translation = t(key);
      if (translation !== undefined) {
        element.setAttribute(attr, translation);
      }
    });
  });
}
