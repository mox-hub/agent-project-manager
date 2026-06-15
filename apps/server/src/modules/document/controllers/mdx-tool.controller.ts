import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { MdxToolService, type ParseResult } from '../services/mdx-tool.service';

@ApiTags('Documents MDX')
@Controller('documents/mdx')
@UseGuards(JwtAuthGuard)
export class MdxToolController {
  constructor(private readonly mdxTool: MdxToolService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse MDX content and extract frontmatter + headings' })
  parse(@Body() body: { content: string }): ParseResult & { headings: ReturnType<MdxToolService['extractHeadings']> } {
    const { frontmatter, body: contentBody } = this.mdxTool.parseFrontmatter(body.content);
    const headings = this.mdxTool.extractHeadings(body.content);
    return { frontmatter, body: contentBody, headings };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate MDX syntax' })
  validate(@Body() body: { content: string }) {
    return this.mdxTool.validateMdx(body.content);
  }

  @Post('export-html')
  @ApiOperation({ summary: 'Export MDX as HTML' })
  exportHtml(@Body() body: { content: string }) {
    return this.mdxTool.renderToHtml(body.content);
  }
}
