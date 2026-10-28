// stats.js - puzzle numbers, streaks and the share result.
// Everything is stored on the player's own device (localStorage); no sign-up.

const GG_FIRST_PUZZLE_DATE = '2025-07-22'; // Puzzle #1
const GG_STATS_KEY = 'gramgrid-stats';
const GG_DAY_MS = 24 * 60 * 60 * 1000;
const GG_SITE_URL = 'https://gramgrid.net';

// 'YYYY-MM-DD' -> whole days since 1 Jan 1970 (UTC, so clock changes don't matter)
function ggDayNumber(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / GG_DAY_MS);
}

// Puzzle number: 22 Jul 2025 = #1
function ggPuzzleNumber(dateStr) {
    return ggDayNumber(dateStr) - ggDayNumber(GG_FIRST_PUZZLE_DATE) + 1;
}

// 'YYYY-MM-DD' -> "28 Oct 2026"
function ggFormatDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
}

// Milliseconds -> "0:36" or "12:05"
function ggFormatTime(ms) {
    const total = Math.floor(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Milliseconds -> "00:58", matching the timer display
function ggFormatClock(ms) {
    const total = Math.floor(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

class GramGridStats {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(GG_STATS_KEY));
            if (saved && saved.solves) return saved;
        } catch (e) {
            // Storage unavailable or corrupt - start fresh
        }
        return { solves: {}, seeded: false };
    }

    save() {
        try {
            localStorage.setItem(GG_STATS_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Could not save stats:', e);
        }
    }

    // Record a solve. Only the first solve of a puzzle counts.
    // ms: solving time (or null), revealed: used Reveal Word, sameDay: solved on the puzzle's own day
    recordSolve(date, { ms, revealed, sameDay }) {
        if (this.data.solves[date]) return;
        this.data.solves[date] = { ms: ms || null, revealed: !!revealed, sameDay: !!sameDay };
        this.save();
    }

    getSolve(date) {
        return this.data.solves[date] || null;
    }

    // One-off: give existing players credit for puzzles they finished before stats existed
    seedFromCompletions(completedStates) {
        if (this.data.seeded) return;
        completedStates.forEach((state, date) => {
            if (!state || !date || this.data.solves[date]) return;
            const solvedOn = state.timestamp ? new Date(state.timestamp).toISOString().split('T')[0] : null;
            this.data.solves[date] = {
                ms: state.completionTime || null,
                revealed: false, // not recorded before, so assume solved
                sameDay: solvedOn === date
            };
        });
        this.data.seeded = true;
        this.save();
    }

    // Days in a row, ending today (or yesterday, if today isn't solved yet)
    currentStreak(todayStr) {
        let day = ggDayNumber(todayStr);
        const sameDayDays = this.sameDayDays();
        if (!sameDayDays.has(day)) day -= 1;
        let streak = 0;
        while (sameDayDays.has(day)) {
            streak++;
            day--;
        }
        return streak;
    }

    bestStreak() {
        const days = [...this.sameDayDays()].sort((a, b) => a - b);
        let best = 0, run = 0, prev = null;
        days.forEach(day => {
            run = (prev !== null && day === prev + 1) ? run + 1 : 1;
            best = Math.max(best, run);
            prev = day;
        });
        return best;
    }

    // Fastest solve without Reveal Word
    bestTime() {
        const times = Object.values(this.data.solves)
            .filter(s => !s.revealed && s.ms > 0)
            .map(s => s.ms);
        return times.length ? Math.min(...times) : null;
    }

    totalSolved() {
        return Object.keys(this.data.solves).length;
    }

    sameDayDays() {
        return new Set(
            Object.entries(this.data.solves)
                .filter(([, s]) => s.sameDay)
                .map(([date]) => ggDayNumber(date))
        );
    }

    // Share message: title (used as the email subject) and spoiler-free text, e.g.
    //   🧩 GramGrid #463 · 28 Oct 2026
    //   🔥 Streak: 4 days
    //   ⏱️ Time: 2:36
    //   ✅ Solved!
    //
    //   Play today's puzzle at https://gramgrid.net
    shareMessage(date, todayStr) {
        const solve = this.getSolve(date);
        const number = ggPuzzleNumber(date);
        const lines = [`🧩 GramGrid #${number} · ${ggFormatDate(date)}`];

        // Streak only for today's puzzle solved today
        if (solve && solve.sameDay && date === todayStr) {
            const streak = this.currentStreak(todayStr);
            lines.push(`🔥 Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`);
        }
        if (solve && solve.ms) {
            lines.push(`⏱️ Time: ${ggFormatTime(solve.ms)}`);
        }
        lines.push(solve && solve.revealed ? '💡 Word revealed' : '✅ Solved!');
        lines.push('');
        lines.push(`Play today's puzzle at ${GG_SITE_URL}`);

        return {
            title: `GramGrid #${number} – Daily Word Puzzle`,
            text: lines.join('\n')
        };
    }
}

// Share: phone share sheet where available, otherwise copy to clipboard.
// The link is in the text only (not passed separately as a url), so apps
// don't add it a second time - Gokuro's email shows it twice.
async function ggShareResult({ title, text }) {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.share) {
        try {
            await navigator.share({ title, text });
            return 'shared';
        } catch (e) {
            if (e.name === 'AbortError') return 'cancelled';
            // Otherwise fall through to copying
        }
    }
    try {
        await navigator.clipboard.writeText(text);
        return 'copied';
    } catch (e) {
        // Older browsers: copy via a hidden text box
        const box = document.createElement('textarea');
        box.value = text;
        box.setAttribute('readonly', '');
        box.style.position = 'fixed';
        box.style.opacity = '0';
        document.body.appendChild(box);
        box.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(box);
        return ok ? 'copied' : 'failed';
    }
}

window.GramGridStats = GramGridStats;
