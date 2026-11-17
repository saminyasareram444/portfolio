# Samin Yasar — Teaching Portfolio

A responsive static teaching portfolio focused on Computer Science, autonomous UAV/VTOL systems, reinforcement learning, explainable AI, adversarial machine learning, and computer vision.

## Files
- `index.html` — site content, inline UAV/VTOL SVG elements, and the teaching dossier
- `styles.css` — responsive layout, light/dark themes, and UAV/VTOL animations
- `script.js` — navigation, drone cursor, swarm background, dossier tabs, and HUD telemetry
- `assets/samin-yasar.webp` — portrait image

## UAV / VTOL motion features
- **Drone cursor**: a quadcopter follows the pointer with spring physics, banks and pitches into turns, spins its rotors faster with speed, and leaves a dotted flight trail. Hovering a link, button, or card puts "target lock" brackets around it, and clicking sends a sonar ping.
- **Swarm background**: a map grid and terrain contours scroll with parallax, a radar sweep lights up drones as it passes, and a UAV swarm flies waypoint missions with mesh links. The drones scatter away from the cursor drone.
- **Pre-flight intro**: a short systems-check overlay, shown once per browser session (click or press any key to skip).
- **HUD details**: live heading, altitude (based on scroll), and Central Time telemetry in the hero; a side altimeter on wide screens; a scrolling ticker band; decoding section labels; tilt-and-glare cards; and magnetic buttons.
- Animated VTOL following a flight path in the hero, and an orbiting UAV in the research section.

## Motion and accessibility
- If the visitor's OS asks for reduced motion, animations start **off**: the background becomes a still map, and the drone cursor tracks the pointer directly, with no inertia, trail, or spinning rotors.
- The drone button in the header turns animations on or off, and the choice is saved in the browser.
- On Windows, "Settings → Accessibility → Visual effects → Animation effects" controls the OS preference.
- The custom cursor is used only on devices with a mouse; touch devices keep native behavior.

## Evidence of teaching practice
The Evidence section has four parts:
- **Teaching in action**: a 12-minute recorded session, "Supporting community: building a sense of belonging in college classrooms" (`assets/teaching-demo.mp4`, with a poster frame), with clickable chapter markers for each slide. The video was brightened, its audio denoised (RNNoise) and normalized, and it carries animated overlays: a title card, a name caption, chapter labels, a progress bar, and an end card. English captions (`assets/teaching-demo.en.vtt`) are on by default, and a plain-text transcript (`assets/teaching-demo-transcript.txt`) is linked below the player.
- **Signature practices**: Predict → Test → Explain, process plus product, multiple ways in, and failure as evidence.
- **Teaching dossier** (tabbed): a proposed 14-week course design, a sample 75-minute lesson plan with an alignment table, a sample project with an analytic rubric, and a formative feedback loop with an exit ticket.
- **50-minute class plan**: "Teaching a drone to land: MDPs and reward design". It uses a bookend–overlay–interleave structure: Update Your Classmate (5 min), guided notes over lecturette 1 (15 min), think-pair-share (5 min), guided notes over lecturette 2 (15 min), lecture wrapper (5 min), and 5 minutes of flex time. A clickable timeline links each block to its segment details, with guided-notes excerpts and the evidence of learning for each segment.

A **Teaching record** block (courses taught or assisted, guest lectures, workshops, and anonymized student feedback) is included as a commented-out template near the end of the Evidence section in `index.html`. Fill it in with verified details and remove the comment markers to publish it. Its styles are already in `styles.css`.

Open `index.html` directly in a browser or deploy the folder to GitHub Pages, Netlify, Vercel, or another static host.
