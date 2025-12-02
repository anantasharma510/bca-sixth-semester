# Sound Effects

This directory contains sound effects for the app.

## ⚠️ IMPORTANT: Add Sound File to Fix Error

If you're seeing "Requiring unknown module" errors, you need to add the sound file.

## Like Sound

To add a like sound effect:

1. **Download a sound file:**
   - Recommended sources:
     - [Mixkit](https://mixkit.co/free-sound-effects/click/) - Free click/like sounds
     - [Freesound](https://freesound.org/) - Community sounds (check license)
     - [Zapsplat](https://www.zapsplat.com/) - Free sound effects (requires account)
   
2. **Recommended sound characteristics:**
   - Short duration (0.1-0.3 seconds)
   - Pleasant, non-intrusive
   - MP3 format (recommended for smaller file size)
   - Low volume to avoid startling users

3. **Save the file:**
   - Name it: `like.mp3`
   - Place it in this directory: `mobile/assets/sounds/like.mp3`
   - **This is REQUIRED** - Metro bundler needs the file to exist at build time

4. **Example sounds that work well:**
   - Soft click/pop sound
   - Gentle "pop" or "plink" sound
   - Subtle notification sound

## Quick Fix for Missing File Error

If you're getting "Requiring unknown module" error:

**Option 1 (Recommended):** Add the sound file
- Download a sound from the sources above
- Save as `mobile/assets/sounds/like.mp3`
- Restart Metro: `npx expo start --clear`

**Option 2 (Temporary):** Disable sound feature
- Open `mobile/src/hooks/useSound.ts`
- Comment out the `require('../../assets/sounds/like.mp3')` line
- The app will work without sound

## Testing

After adding the sound file, restart your Expo development server:
```bash
npx expo start --clear
```

The sound will play automatically when users like a post. If the sound file is missing, you'll get a build error until you add it.

