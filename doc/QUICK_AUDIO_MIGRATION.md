# Quick Audio Migration Guide

## Local Setup (Before Deployment)

1. **Map existing files to database:**
   ```bash
   npm run db:map-audio
   ```

2. **Verify mapping:**
   - Check admin panel - all items should show audio/timestamps status
   - Or use: `npx prisma studio`

---

## Server Deployment

### Step 1: Copy Files to Server

**Option A: Using rsync (Recommended)**
```bash
# From your local machine
rsync -avz --progress public/audio/ user@your-server:/var/www/e_course/public/audio/
rsync -avz --progress public/timestamps/ user@your-server:/var/www/e_course/public/timestamps/
```

**Option B: Using SCP**
```bash
scp -r public/audio user@your-server:/var/www/e_course/public/
scp -r public/timestamps user@your-server:/var/www/e_course/public/
```

**Option C: Using Git (if files are committed)**
```bash
# On server
cd /var/www/e_course
git pull
```

### Step 2: Set Permissions on Server

```bash
cd /var/www/e_course
chmod -R 755 public/audio
chmod -R 755 public/timestamps
```

### Step 3: Map Files to Database on Server

```bash
cd /var/www/e_course
npm run db:map-audio
```

This will update the database with the actual file paths on the server.

### Step 4: Verify

```bash
# Check files exist
ls -la public/audio/ | head -5
ls -la public/timestamps/ | head -5

# Test file access
curl http://localhost/audio/your-file.mp3 -I
```

---

## What Gets Mapped?

- ✅ Introduction audio/timestamps
- ✅ Chapter 1 sections (all 11 sections)
- ✅ Learning Objectives (combined audio)
- ✅ Key Terms (combined audio)
- ✅ Quiz Questions (question + options audio)
- ✅ Quiz Correct Explanations
- ✅ Quiz Incorrect Explanations (all options)

---

## Troubleshooting

**Files not found?**
- Check file paths in database: `npx prisma studio`
- Verify files exist: `ls -la public/audio/`
- Check Nginx config: `sudo nginx -t`

**Mapping didn't work?**
- Run script again: `npm run db:map-audio`
- Check console output for warnings
- Manually update via admin panel if needed

---

**For detailed instructions, see:** `doc/MIGRATE_AUDIO_FILES.md`
