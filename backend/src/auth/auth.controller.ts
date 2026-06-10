import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Create a new user account
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      example: {
        user: { id: 'uuid', email: 'user@example.com', name: 'John', role: 'AGENT' },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate and receive a JWT token
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email & password' })
  @ApiOkResponse({
    description: 'Login successful — returns JWT token',
    schema: {
      example: {
        user: { id: 'uuid', email: 'user@example.com', name: 'John', role: 'AGENT' },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /api/v1/auth/me
   * Return the currently authenticated user
   */
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({
    description: 'Current user profile',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        name: 'John',
        role: 'AGENT',
        isActive: true,
        createdAt: '2026-05-12T13:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }
}


