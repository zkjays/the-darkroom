export const APPROVED_TESTERS = [
  "zkjays",
  "0x_cati",
  "z0renx",
  "zaimiri",
  "aominethefirst",
  "0xtyomych",
  "netrovert_x",
  "aashish_web3",
  "buzzmalx",
  "jim_buildr",
  "rb_investor45",
  "pixassohq",
];

export function isTester(handle: string): boolean {
  const clean = handle.toLowerCase().replace("@", "").trim();
  return APPROVED_TESTERS.includes(clean);
}
