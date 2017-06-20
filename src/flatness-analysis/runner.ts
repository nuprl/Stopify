import { transform } from '../common/helpers'
import * as flatness from './dependencyGraph'
import * as fs from 'fs'

const code: string = fs.readFileSync(process.argv[2]).toString();

transform(code, [[flatness]])
