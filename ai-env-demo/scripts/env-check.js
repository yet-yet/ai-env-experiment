import os from "node:os";

const names = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPSEEK_API_KEY",
  "DASHSCOPE_API_KEY"
];

console.log(`Node.js: ${process.version}`);
console.log(`平台: ${process.platform}/${process.arch}`);
console.log(`CPU 逻辑处理器: ${os.cpus().length}`);
console.log(`内存: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GiB`);

for (const name of names) {
  const value = process.env[name];
  console.log(`${name}: ${value ? `已设置（${value.length} 个字符，已隐藏）` : "未设置"}`);
}
