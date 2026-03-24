# Computer Vision Output Videos

Placez vos fichiers vidéo dans ce dossier pour qu'ils s'affichent dans la section "Computer Vision - Sorties des Modèles" du Dashboard.

## Format des fichiers

- **Formats supportés**: MP4, WebM, Ogg
- **Fichiers attendus**:
  - `cv-output-1.mp4` - Production Line A
  - `cv-output-2.mp4` - Production Line B
  - `cv-output-3.mp4` - Quality Control
  - `cv-output-4.mp4` - Assembly Station
  - `cv-output-5.mp4` - Packaging Area
  - `cv-output-6.mp4` - Safety Monitoring

## Accès aux vidéos

Les vidéos sont servies depuis le dossier `public/videos/` et peuvent être accédées via:
```
/videos/cv-output-1.mp4
/videos/cv-output-2.mp4
etc...
```

## Personnalisation

Pour modifier les vidéos affichées ou en ajouter de nouvelles:

1. Éditez le fichier `src/pages/Dashboard.jsx`
2. Modifiez les props du composant `<VideoPlayer />`:
   - `title`: Titre de la vidéo
   - `videoPath`: Chemin vers le fichier vidéo (relatif à `public/`)
   - `description`: Description courte

Exemple:
```jsx
<VideoPlayer 
    title="Ma Vidéo"
    videoPath="/videos/ma-video.mp4"
    description="Description de ma vidéo"
/>
```

## Fonctionnalités du lecteur

- ▶️ Play/Pause
- ↻ Recommencer (restart)
- 🔊 Mute/Unmute
- ⛶ Fullscreen
- 📊 Barre de progression
- 🔄 Répétition automatique (loop)
- Temps écoulé et durée totale

## Notes

- Les vidéos se répètent automatiquement en boucle
- Le lecteur est responsive et s'adapte à tous les appareils
- Les contrôles s'affichent au survol pour une meilleure UX
