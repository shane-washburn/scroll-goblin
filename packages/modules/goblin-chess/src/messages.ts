import { t } from '@hedgeling/i18n/runtime';
export function localizeError(message: string) {
  switch (message) {
    case 'All three cheats have been used.': return t('All three cheats have been used.');
    case 'Chaos mode needs its server rate limiter configured.': return t('Chaos mode needs its server rate limiter configured.');
    case 'Choose one of your captured non-king pieces.': return t('Choose one of your captured non-king pieces.');
    case 'Choose one of your pieces and a different destination.': return t('Choose one of your pieces and a different destination.');
    case 'Could not reach the chaos opponent service. Retry this turn once the connection returns. The Universe simulator handles coin flips and verdicts, not the LLM opponent.': return t('Could not reach the chaos opponent service. Retry this turn once the connection returns. The Universe simulator handles coin flips and verdicts, not the LLM opponent.');
    case 'Invalid board.': return t('Invalid board.');
    case 'Resurrect onto an empty square.': return t('Resurrect onto an empty square.');
    case 'Stockfish timed out. Retry the turn.': return t('Stockfish timed out. Retry the turn.');
    case 'That move needs a teleport cheat.': return t('That move needs a teleport cheat.');
    case 'That square already belongs to one of your pieces.': return t('That square already belongs to one of your pieces.');
    case 'The spirit is resting. Try again shortly.': return t('The spirit is resting. Try again shortly.');
    case 'The spirit lost its train of thought. Retry this turn.': return t('The spirit lost its train of thought. Retry this turn.');
    case 'The spirit needs a moment. Try again shortly.': return t('The spirit needs a moment. Try again shortly.');
    case 'The spirit proposed an impossible board edit. Retry its turn.': return t('The spirit proposed an impossible board edit. Retry its turn.');
    case 'Transform a non-king into a different non-king piece.': return t('Transform a non-king into a different non-king piece.');
    case 'Unknown action.': return t('Unknown action.');
    default: return t(message);
  }
}
