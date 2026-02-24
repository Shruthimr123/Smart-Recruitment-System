import * as path from 'path';
 
interface LanguageConfigItem {
  extension: string;
  image: string;
  command: (file: string) => string;
  setupCommand?: string;
  extraVolume?: string;
}
 
export const LANGUAGE_CONFIG: Record<string, LanguageConfigItem> = {
  cpp: {
    extension: '.cpp',
    image: 'gcc:13.2.0',
    extraVolume:
      'C:\\Users\\Sam Christopher\\Desktop\\Mirfra SRS\\Smart Recruitment System\\SRS\\backend\\main-app\\src\\utils\\Wrappers',
    command: (file) =>
      `g++ -std=c++17 -I/app/wrappers ${file} -o /tmp/out && /tmp/out`,
  },
 
  python: {
    extension: '.py',
    image: 'python:3.10.4',
    command: (file) => `python ${file}`,
  },
 
  javascript: {
    extension: '.js',
    image: 'node:18.15.0',
    command: (file) => `node ${file}`,
  },
 
  c: {
    extension: '.c',
    image: 'gcc:13.2.0',
    command: (file) => `gcc ${file} -o /tmp/out && /tmp/out`,
  },
 
 java: {
  extension: '.java',
  image: 'openjdk:17',
  extraVolume: 'C:\\Users\\Sam Christopher\\Desktop\\Mirfra SRS\\Smart Recruitment System\\SRS\\backend\\main-app\\src\\utils\\libs',
  command: (_file) => `javac -cp ".:/app/libs/*" Main.java && java -cp ".:/app/libs/*" Main`,
},
 
csharp: {
  extension: '.cs',
  image: 'mono',
  extraVolume:
    'C:\\Users\\Sam Christopher\\Desktop\\Mirfra SRS\\Smart Recruitment System\\SRS\\backend\\main-app\\src\\utils\\libs',
  command: (file) =>
    `csc ${file} -out:/app/program.exe \
    -r:/app/libs/Newtonsoft.Json.dll \
    -r:/usr/lib/mono/4.5/System.dll \
    -r:/usr/lib/mono/4.5/System.Core.dll \
    -r:/usr/lib/mono/4.5/mscorlib.dll \
    -r:/usr/lib/mono/4.8-api/Facades/netstandard.dll \
    && MONO_PATH=/app/libs mono /app/program.exe`,
},
 
 
 
};