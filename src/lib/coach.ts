import type { Block, CalendarEvent, Task } from '../types'
import { daysBetween, formatDate, relativeDay, todayISO } from './date'

export type CoachContext = {
  name: string
  tasks: Task[]
  events: CalendarEvent[]
  blocks: Block[]
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w))

function nextExam(ctx: CoachContext): CalendarEvent | undefined {
  return ctx.events
    .filter((e) => e.kind === 'exam' && e.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

function openTasks(ctx: CoachContext): string {
  const open = ctx.tasks.filter((t) => !t.done).slice(0, 4)
  if (open.length === 0) return 'Your task list is empty, so pick the topic you fear most.'
  return open
    .map((t) => `• ${t.title} (${t.subject}, ${relativeDay(t.due)})`)
    .join('\n')
}

/**
 * Rule-based study coach. This is deliberately NOT an LLM: it gives a reliable
 * method for common situations and says so in the interface.
 */
export function coachReply(raw: string, ctx: CoachContext): string {
  const text = raw.toLowerCase()
  const exam = nextExam(ctx)
  const name = ctx.name ? `${ctx.name}, ` : ''
  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  if (has(text, ['plan', 'schedule', 'revise', 'revising', 'revision', 'study for', 'timetable', 'exam', 'test'])) {
    const days = exam ? daysBetween(todayISO(), exam.date) : null
    return [
      capitalise(`${name}here is a plan you can actually finish.`),
      '',
      exam
        ? `Next exam: ${exam.title} on ${formatDate(exam.date)} — ${days} day${days === 1 ? '' : 's'} away.`
        : 'No exam is saved in your calendar yet — add it there so the plan has a deadline.',
      '',
      'Three passes beat one long cram:',
      '1. Map it (20 min): list every topic on the syllabus, mark each as red / amber / green.',
      '2. Attack red (2 × 25 min blocks): one topic per block, past-paper question at the end of each.',
      '3. Test green (25 min): write answers from memory, then check. Anything you miss becomes amber again.',
      '',
      'Rules: one 25-minute block at a time, phone in another room, and a 5-minute break between blocks.',
      '',
      'Open work right now:',
      openTasks(ctx),
      '',
      'Tell me the subject and I will split it into specific topics and block lengths.',
    ].join('\n')
  }

  if (has(text, ['math', 'derivative', 'integral', 'equation', 'algebra', 'calculus', 'trig'])) {
    return [
      'For maths problems, the blocker is almost never the final step — it is one rule you have not automated yet.',
      '',
      'Do this on paper:',
      '1. Write what is given and exactly what is asked, in words.',
      '2. Name the rule or formula that connects them.',
      '3. Do one line per step. No mental arithmetic in your head.',
      '4. If it stalls, write "I do not know how to ___" — that sentence is the real question.',
      '',
      'Then check a step-by-step solver (Wolfram Alpha or Symbolab in Resources), but copy only the next step, close the tab, and redo it. If you cannot redo it cold tomorrow, it is not learned.',
      '',
      'Send me the exact problem and where your working gets stuck.',
    ].join('\n')
  }

  if (has(text, ['essay', 'writing', 'paragraph', 'analysis', 'english', 'report'])) {
    return [
      'Essays are won in the plan, not the typing.',
      '',
      '1. Turn the question into one sentence with a claim and a "because".',
      '2. Collect three pieces of evidence, quote them exactly.',
      '3. For each: point → evidence → explain how it supports your claim → link to the next point.',
      '4. Write the body first, introduction last. Conclusions do not repeat — they widen.',
      '',
      'If the page is blank, write the worst possible first sentence and fix it later. Starting beats perfecting.',
      '',
      'Paste your question and I will suggest a structure (not written for you).',
    ].join('\n')
  }

  if (has(text, ['code', 'program', 'python', 'javascript', 'java', 'bug', 'error', 'compile', 'function'])) {
    return [
      'Debugging is a skill you can rehearse. Use the same loop every time:',
      '',
      '1. Read the error bottom-up: type, message, file, line.',
      '2. Print or log the value you assumed, one line before the failure.',
      '3. Shrink it: comment out everything, add code back until it breaks. That is the bug.',
      '4. Search the exact error message with the language name — someone has hit it.',
      '5. Fix it, then explain out loud why it broke.',
      '',
      'If it is a learning exercise: type the code yourself, never paste. When it works, rewrite it from memory and change one thing.',
      '',
      'Send the error text and the smallest snippet that reproduces it.',
    ].join('\n')
  }

  if (has(text, ['cyber', 'security', 'hack', 'ctf', 'hacker', 'pentest', 'networking'])) {
    return [
      'For cyber security, build depth in this order — jumping around is why people stall:',
      '',
      '1. Linux and the shell (OverTheWire Bandit, then Natas).',
      '2. Networking: IP, DNS, HTTP, ports, wireshark basics.',
      '3. Web basics: HTML, HTTP requests, then PortSwigger Web Security Academy labs.',
      '4. Programming for scripts: Python plus a bit of bash.',
      '5. Cryptography fundamentals (CryptoHack).',
      '',
      'Free path: TryHackMe beginner path → PortSwigger labs → picoCTF. One room per study block, written notes after each, no copy-pasting answers.',
      '',
      'Ethics check: only ever test systems you own or have written permission for.',
    ].join('\n')
  }

  if (has(text, ['chemistry', 'physics', 'biology', 'science', 'lab', 'experiment'])) {
    return [
      'Science sticks when you can predict before you check.',
      '',
      '1. Read the diagram/equation first and guess what happens.',
      '2. Predict the outcome in one sentence.',
      '3. Test with a simulation (PhET in Resources) or the worked example.',
      '4. Explain the gap between your prediction and the result.',
      '',
      'For calculations: units, formula, substitute, solve, sanity-check the size of the answer. Most lost marks are units or rearranging, not physics.',
      '',
      'Which topic is it? I can break it into concepts to test yourself on.',
    ].join('\n')
  }

  if (has(text, ['motivat', 'distract', 'procrastinat', 'focus', 'phone', 'lazy', 'waste'])) {
    return [
      'Motivation will not arrive before you start — it shows up two minutes in. So make starting tiny.',
      '',
      '• Set a 10-minute timer and promise yourself you may quit when it rings. You usually will not.',
      '• Put the phone in a different room. Willpower loses to proximity every time.',
      '• Keep one browser window and one tab for the work.',
      '• End each session by writing the exact next step — tomorrow you starts instantly.',
      '• Track it: the focus log in this app is the scoreboard. Never break the chain twice.',
      '',
      'If you have been off for weeks: one 15-minute session today is the whole goal. Not a perfect week — one session.',
    ].join('\n')
  }

  if (has(text, ['stuck', 'confus', 'confused', "don't get", 'dont get', 'do not understand', 'lost', 'help'])) {
    return [
      'Good — being specific about where you are stuck is the hard part. Try this:',
      '',
      '1. Write the last thing you understood in one line.',
      '2. Write the first thing you did not.',
      '3. Say which of these it is: missing fact, missing method, misread question, or careless step.',
      '4. Then ask one question that fits in a single sentence.',
      '',
      'Tell me the subject, the question, and that one sentence, and I can suggest the next step.',
    ].join('\n')
  }

  return [
    capitalise(`${name}I can help most when I know the subject and the exact sticking point.`),
    '',
    'Try one of these:',
    '• "Plan my week for a maths exam in 6 days"',
    '• "Explain why a derivative is a slope, like I am 15"',
    '• "I am stuck on balancing this equation: Fe + O2 → Fe2O3"',
    '• "How do I start a Python project without tutorials?"',
    '',
    'Until then, the highest-value thing you can do is pick the smallest unfinished task:',
    openTasks(ctx),
    '',
    'Set a 25-minute countdown and do only the first one.',
  ].join('\n')
}
