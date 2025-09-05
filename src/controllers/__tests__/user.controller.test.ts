import { UserController } from './usercontroller.controller';
import { Request, Response } from 'express';

describe('UserControllerController', () => {
    let controller: UserController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        controller = new UserController();
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('index', () => {
        it('should return list of usercontrollers', async () => {
            await controller.index(mockRequest as Request, mockResponse as Response);
            
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.any(Array)
                })
            );
        });
    });

    describe('show', () => {
        it('should return specific usercontroller', async () => {
            mockRequest.params = { id: '1' };
            
            await controller.show(mockRequest as Request, mockResponse as Response);
            
            expect(mockResponse.status).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should return 400 if ID is missing', async () => {
            mockRequest.params = {};
            
            await controller.show(mockRequest as Request, mockResponse as Response);
            
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
});