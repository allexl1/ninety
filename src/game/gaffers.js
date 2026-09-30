// Gaffer pool: parody names only (public repo — no real names).
// Each gaffer nudges exactly ONE line by +1 (flavor first, tiny math).
export const GAFFERS = [
  { id: 'turtleneck', name: 'The Turtleneck', epithet: 'Patient positional chess', blurb: 'Third-man runs on loop. The ball does the running.', line: 'midfield', delta: 1 },
  { id: 'firefighter', name: 'The Firefighter', epithet: 'Clean sheets by any means', blurb: 'Eleven behind the ball. Heroes at the final whistle.', line: 'defence', delta: 1 },
  { id: 'rocknroll', name: 'Rock’n’Roll', epithet: 'Sprints, presses, shots', blurb: 'Breathing optional. Score one more than them.', line: 'attack', delta: 1 },
  { id: 'whisperer', name: 'The Shot-Stop Whisperer', epithet: 'Unsavables, saved', blurb: 'Your keeper grows an extra arm. Usually.', line: 'keeper', delta: 1 },
  { id: 'vibes', name: 'The Vibes Manager', epithet: 'Arm around the shoulder', blurb: 'Nobody runs harder for anyone else. Attack flows.', line: 'attack', delta: 1 },
  { id: 'goblin', name: 'The Set-Piece Goblin', epithet: 'Eleven men behind every dead ball', blurb: 'Including the taker. Defend everything.', line: 'defence', delta: 1 },
  { id: 'carousel', name: 'The Passing Carousel', epithet: 'Keep-ball until they sleep', blurb: 'A thousand passes. Then the knife-edge through ball.', line: 'midfield', delta: 1 },
  { id: 'routeone', name: 'The Route One Romantic', epithet: 'Keeper launches it', blurb: 'Big man flicks it. Little man runs it. Football.', line: 'attack', delta: 1 },
];

export function spinGaffer(rng) {
  return GAFFERS[Math.floor(rng() * GAFFERS.length)];
}
