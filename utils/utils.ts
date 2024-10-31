export function normalizeAngle(angle: number) {
  angle = angle % (2 * Math.PI);
  if (angle < 0) {
    angle += 2 * Math.PI;
  }
  return angle;
}

export function parseRads(angle: number) {
  angle = angle * (Math.PI / 180);
  return angle;
}

export function getLengthBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}