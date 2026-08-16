/**
 * I18n module configuration
 */

import { I18nModule, I18nJsonLoader } from 'nestjs-i18n';
import { Module } from '@nestjs/common';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'zh-CN',
      loaderOptions: {
        path: path.join(process.cwd(), 'src/i18n/resources'),
        watch: true,
      },
      loader: I18nJsonLoader,
      typesOutputPath: path.join(
        process.cwd(),
        'src/generated/i18n.generated.ts',
      ),
    }),
  ],
  exports: [I18nModule],
})
export class I18nConfigModule {}
